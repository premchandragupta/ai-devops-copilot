// Robust analyzer for Windows: calls policy-engine, then falls back to a local regex scan
// if policy-engine returns 0 findings (so you always get a signal).
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

type AnalyzeOpts = { repoPath: string; baseSha: string; headSha: string; outDir?: string; fullScan?: boolean }
type Finding = { tool: string; severity: string; file: string; line?: number; ruleId?: string; title?: string; message?: string }

function sh(cmd: string, args: string[], cwd?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise(resolve => {
    const p = spawn(cmd, args, { cwd, shell: process.platform === 'win32' })
    let stdout = '', stderr = ''
    p.stdout.on('data', d => (stdout += d.toString()))
    p.stderr.on('data', d => (stderr += d.toString()))
    p.on('close', code => resolve({ code: code ?? 0, stdout, stderr }))
  })
}
function normSlash(p: string) { return p.replace(/\\/g, '/').toLowerCase() }

async function getChangedFiles(repoPath: string, base: string, head: string): Promise<string[]> {
  if (!base || !head) return []
  const r = await sh('git', ['-C', repoPath, 'diff', '--name-only', `${base}..${head}`])
  if (r.code !== 0) return []
  return r.stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(normSlash)
}

function resolvePolicyCliAbs(): string {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const try1 = path.resolve(__dirname, '../../policy-engine/dist/cli.js')
  const try2 = path.resolve(__dirname, '../../../services/policy-engine/dist/cli.js')
  const try3 = path.resolve(process.cwd(), '../policy-engine/dist/cli.js')
  for (const p of [try1, try2, try3]) if (fs.existsSync(p)) return p
  // Don’t throw — we’ll fall back to local scan if missing
  return ''
}

async function runPolicyEngine(repoPath: string): Promise<{ findings: Finding[] }> {
  const cli = resolvePolicyCliAbs()
  if (!cli) return { findings: [] }
  const nodeBin = process.execPath
  const args = [cli, '--path', repoPath]
  const env = { ...process.env } // preserves POLICY_SEMGREP_BIN if you set it
  return new Promise(resolve => {
    const p = spawn(nodeBin, args, { shell: process.platform === 'win32', env })
    let out = ''
    p.stdout.on('data', d => (out += d.toString()))
    p.on('close', () => {
      try {
        const json = JSON.parse(out || '{}')
        resolve({ findings: Array.isArray(json.findings) ? json.findings : [] })
      } catch { resolve({ findings: [] }) }
    })
  })
}

// ---- local fallback scanner (regex) ----
function walkFiles(root: string, exts = ['.js', '.jsx', '.ts', '.tsx']) {
  const out: string[] = []
  const skip = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next'])
  const stack = [root]
  while (stack.length) {
    const d = stack.pop()!
    let items: string[] = []
    try { items = fs.readdirSync(d) } catch { continue }
    for (const name of items) {
      const fp = path.join(d, name)
      let st: fs.Stats
      try { st = fs.statSync(fp) } catch { continue }
      if (st.isDirectory()) { if (!skip.has(name)) stack.push(fp) }
      else if (exts.includes(path.extname(name))) out.push(fp)
    }
  }
  return out
}
function relToRepo(repo: string, p: string) {
  let abs = p
  if (!path.isAbsolute(abs)) abs = path.resolve(repo, abs)
  return path.relative(repo, abs).split(path.sep).join('/')
}
function localRegexScan(repoPath: string): Finding[] {
  const files = walkFiles(repoPath)
  const findings: Finding[] = []
  const rules: { id: string; title: string; sev: 'HIGH'|'MEDIUM'; test: (l: string)=>boolean }[] = [
    { id: 'js-eval-detected', title: 'Avoid using eval()', sev: 'MEDIUM', test: l => /\beval\s*\(/i.test(l) },
    { id: 'js-dangerous-child-process', title: 'Dangerous child_process execution', sev: 'HIGH',
      test: l => /(child_process|execSync|spawn\s*\(|\bexec\s*\()/i.test(l) && !/\/\/\s*safe-ignore/i.test(l) },
    { id: 'express-cors-any-origin', title: 'CORS allows any origin', sev: 'MEDIUM',
      test: l => /app\.use\s*\(\s*cors\s*\(/i.test(l) || /origin\s*:\s*["']\*/i.test(l) },
    { id: 'react-dangerously-set-inner-html', title: 'dangerouslySetInnerHTML used (XSS risk)', sev: 'MEDIUM',
      test: l => /dangerouslySetInnerHTML\s*=/i.test(l) },
    { id: 'secret-openai-key', title: 'Likely OpenAI API key hardcoded', sev: 'HIGH',
      test: l => /sk-[A-Za-z0-9_\-]{10,}/.test(l) },
    { id: 'secret-slack-bot', title: 'Likely Slack bot token hardcoded', sev: 'HIGH',
      test: l => /xoxb-[A-Za-z0-9_\-]{10,}/.test(l) },
    { id: 'mongoose-plaintext-password', title: 'Password stored as plaintext String', sev: 'HIGH',
      test: l => /password\s*:\s*String/i.test(l) || /password\s*:\s*\{\s*type\s*:\s*String/i.test(l) },
  ]
  for (const fp of files) {
    let content = ''
    try { content = fs.readFileSync(fp, 'utf8') } catch { continue }
    const lines = content.split(/\r?\n/)
    lines.forEach((line, idx) => {
      for (const r of rules) {
        if (r.test(line)) {
          findings.push({
            tool: 'regex',
            severity: r.sev,
            file: relToRepo(repoPath, fp),
            line: idx + 1,
            ruleId: r.id,
            title: r.title,
            message: line.trim().slice(0, 200)
          })
        }
      }
    })
  }
  return findings
}
// ---------------------------------------

function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }) }
function writeReport(outDir: string, data: any): string {
  ensureDir(outDir)
  const file = path.resolve(outDir, `report-${Date.now()}.json`)
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
  return file
}

function filterByFiles(findings: Finding[], files: string[]): Finding[] {
  const set = new Set(files.map(normSlash))
  return findings.filter(f => set.has(normSlash(f.file)))
}

export async function analyzeRepoDiff(opts: AnalyzeOpts): Promise<{ result: any; exitCode: number }> {
  const repo = path.resolve(opts.repoPath)
  const outDir = path.resolve(opts.outDir || path.join(process.cwd(), 'reports'))
  const changed = await getChangedFiles(repo, opts.baseSha, opts.headSha)
  let fullScan = Boolean(opts.fullScan) || process.env.RUNNER_FULL_SCAN === '1' || changed.length === 0

  // 1) Try policy-engine
  let pe = await runPolicyEngine(repo)
  let findings: Finding[] = Array.isArray(pe.findings) ? pe.findings : []

  // 2) If diff-only and findings exist, filter to changed files
  if (!fullScan && findings.length > 0) {
    findings = filterByFiles(findings, changed)
  }

  // 3) Fallback: if still empty, run local regex scan (full repo)
  if (findings.length === 0) {
    fullScan = true
    findings = localRegexScan(repo)
  }

  const total = findings.length
  const high = findings.filter(f => (f.severity || '').toUpperCase() === 'HIGH').length
  const result = {
    mode: fullScan ? 'full' : 'diff',
    repoPath: repo,
    baseSha: opts.baseSha,
    headSha: opts.headSha,
    stats: { total, high },
    findings
  }
  const reportPath = writeReport(outDir, result)
  const exitCode = high > 0 ? 1 : 0
  return { result: { ...result, reportPath }, exitCode }
}

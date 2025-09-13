// A robust, Windows-friendly analyzer the CLI can auto-pick.
// - Extracts changed files from git
// - Calls policy-engine if available
// - Writes a JSON report
// - Returns exitCode=1 when HIGH is present

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type AnalyzeOpts = {
  repoPath: string
  baseSha: string
  headSha: string
  outDir?: string
}

type Finding = { tool?: string; severity?: string; file?: string; line?: number|string; ruleId?: string; title?: string; message?: string; remediation?: string }

function execp(cmd: string, args: string[], cwd?: string): Promise<{ code:number; stdout:string; stderr:string }> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, shell: process.platform === 'win32' })
    let stdout = '', stderr = ''
    p.stdout.on('data', d => stdout += d.toString())
    p.stderr.on('data', d => stderr += d.toString())
    p.on('close', code => resolve({ code: code ?? 0, stdout, stderr }))
  })
}

async function gitChangedFiles(repoPath: string, base: string, head: string): Promise<{files:string[], binary:Set<string>}> {
  // List changed files
  const names = await execp('git', ['-C', repoPath, 'diff', '--name-only', `${base}..${head}`])
  if (names.code !== 0) throw new Error(`git diff --name-only failed: ${names.stderr || names.stdout}`)

  const files = names.stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean)

  // Detect binary via numstat '-' markers
  const num = await execp('git', ['-C', repoPath, 'diff', '--numstat', `${base}..${head}`])
  const binary = new Set<string>()
  for (const line of num.stdout.split(/\r?\n/)) {
    // format: "<add>\t<del>\t<path>"
    if (!line.trim()) continue
    const parts = line.split('\t')
    if (parts.length < 3) continue
    const [add, del, file] = parts
    if (add === '-' || del === '-') binary.add(file)
  }

  return { files, binary }
}

function findRepoRootFromHere(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))          // .../services/runner/dist
  return path.resolve(here, '..', '..')                              // .../services/runner
}

function resolvePolicyEngineCli(): string | null {
  if (process.env.POLICY_ENGINE_BIN && fs.existsSync(process.env.POLICY_ENGINE_BIN)) {
    return process.env.POLICY_ENGINE_BIN
  }
  const runnerRoot = findRepoRootFromHere()                          // .../services/runner
  const cli = path.resolve(runnerRoot, '..', 'policy-engine', 'dist', 'cli.js')
  return fs.existsSync(cli) ? cli : null
}

async function runPolicyEngine(repoPath: string): Promise<{ findings: Finding[] }> {
  const cli = resolvePolicyEngineCli()
  if (!cli) return { findings: [] }  // gracefully skip if not built

  const res = await execp('node', [cli, '--path', repoPath])
  if (res.code !== 0) throw new Error(`policy-engine failed: ${res.stderr || res.stdout}`)
  try {
    const parsed = JSON.parse(res.stdout)
    if (Array.isArray(parsed?.findings)) return { findings: parsed.findings as Finding[] }
  } catch {}
  return { findings: [] }
}

export async function analyze(opts: AnalyzeOpts): Promise<{ result: { findings: Finding[], changedFiles: string[], reportPath: string }, exitCode:number }> {
  const repoPath = String(opts.repoPath || '').trim()
  const baseSha  = String(opts.baseSha  || '').trim()
  const headSha  = String(opts.headSha  || '').trim()
  const outDir   = path.resolve(String(opts.outDir || path.resolve(process.cwd(), 'reports')))

  if (!repoPath || !baseSha || !headSha) {
    throw new Error(`Missing params. repoPath="${repoPath}" baseSha="${baseSha}" headSha="${headSha}"`)
  }
  fs.mkdirSync(outDir, { recursive: true })

  const { files, binary } = await gitChangedFiles(repoPath, baseSha, headSha)

  // Policy engine (skip binaries)
  const { findings } = await runPolicyEngine(repoPath)

  // Mark/skip binaries just in case
  const filtered = findings.filter(f => f.file ? !binary.has(f.file) : true)

  const report = {
    changedFiles: files,
    findings: filtered,
    summary: {
      total: filtered.length,
      bySeverity: filtered.reduce((acc: Record<string, number>, f) => {
        const s = (f.severity || 'UNKNOWN').toUpperCase()
        acc[s] = (acc[s] || 0) + 1
        return acc
      }, {})
    },
    baseSha, headSha, generatedAt: new Date().toISOString()
  }

  const reportPath = path.join(outDir, `report-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')

  const highCount = report.summary.bySeverity['HIGH'] || 0
  const exitCode = highCount > 0 ? 1 : 0

  return { result: { findings: filtered, changedFiles: files, reportPath }, exitCode }
}

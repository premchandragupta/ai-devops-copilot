// Windows-safe policy-engine CLI with Semgrep + regex fallback.
// - Scans ALL YAML rules in ./rules (recursively) with Semgrep
// - Auto-locates semgrep (pipx) or uses POLICY_SEMGREP_BIN/SEMGREP_BIN
// - Adds --no-git-ignore
// - If Semgrep yields 0, run regex fallback over JS/TS/JSX/TSX files
// - Normalizes paths relative to repo; prints normalized JSON

import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

type Finding = {
  tool: string
  severity: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"
  file: string
  line?: number
  ruleId?: string
  title?: string
  message?: string
}

function execp(cmd: string, args: string[], cwd?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, shell: process.platform === "win32" })
    let stdout = "", stderr = ""
    p.stdout.on("data", d => stdout += d.toString())
    p.stderr.on("data", d => stderr += d.toString())
    p.on("close", code => resolve({ code: code ?? 0, stdout, stderr }))
  })
}

function here(...p: string[]) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  return path.resolve(__dirname, ...p)
}
function rulesRoot() { return here("../rules") }
function relToRepo(repo: string, p: string) {
  let abs = p
  if (!path.isAbsolute(abs)) abs = path.resolve(repo, abs)
  return path.relative(repo, abs).split(path.sep).join("/")
}

function listRuleFiles(dir: string): string[] {
  const out: string[] = []
  if (!fs.existsSync(dir)) return out
  const walk = (d: string) => {
    for (const n of fs.readdirSync(d)) {
      const fp = path.join(d, n)
      const st = fs.statSync(fp)
      if (st.isDirectory()) walk(fp)
      else if (n.toLowerCase().endsWith(".yml") || n.toLowerCase().endsWith(".yaml")) out.push(fp)
    }
  }
  walk(dir)
  return out
}

function resolveSemgrepBin(): string {
  const envBin = process.env.POLICY_SEMGREP_BIN || process.env.SEMGREP_BIN
  if (envBin && fs.existsSync(envBin)) return envBin
  const home = process.env.USERPROFILE || process.env.HOME || ""
  const candidates = [
    path.join(home ?? "", "pipx", "venvs", "semgrep", "Scripts", "semgrep.exe"),
    path.join(home ?? "", ".local", "pipx", "venvs", "semgrep", "bin", "semgrep"),
    "semgrep",
  ]
  for (const c of candidates) {
    try { if (c === "semgrep" || fs.existsSync(c)) return c } catch {}
  }
  return "semgrep"
}

async function runSemgrep(repoPath: string) {
  const warnings: string[] = []
  let configs = listRuleFiles(rulesRoot())
  let tmpConfigPath: string | null = null

  // Fallback embedded rules if none present
  if (configs.length === 0) {
    const FALLBACK_RULES = `rules:
- id: js-eval-detected
  message: "Avoid using eval() - code injection risk."
  languages: [javascript, typescript]
  severity: MEDIUM
  pattern: eval(...)

- id: js-dangerous-child-process
  message: "Use of child_process exec/execSync/spawn(shell=true) is dangerous (command injection)."
  languages: [javascript, typescript]
  severity: HIGH
  pattern-either:
    - patterns:
        - pattern: exec(...)
        - pattern-inside: |
            import { exec } from "child_process"
            ...
    - pattern: require("child_process").exec(...)
    - pattern: require('child_process').exec(...)
    - pattern: execSync(...)
    - pattern: spawn(..., ..., { ..., shell: true, ... })

- id: express-cors-any-origin
  message: "CORS allows any origin; restrict origins."
  languages: [javascript, typescript]
  severity: MEDIUM
  pattern-either:
    - pattern: app.use(cors())
    - patterns:
        - pattern: app.use(cors({ ... }))
        - pattern-inside: |
            import cors from "cors"
            ...
    - patterns:
        - pattern: app.use(cors({ origin: "*", ... }))

- id: react-dangerously-set-inner-html
  message: "dangerouslySetInnerHTML used; XSS risk."
  languages: [javascript, typescript, jsx, tsx]
  severity: MEDIUM
  pattern: <... dangerouslySetInnerHTML={{...}} ... />

- id: secret-openai-key
  message: "Likely OpenAI API key hardcoded (sk-...)."
  languages: [javascript, typescript]
  severity: HIGH
  pattern-regex: "sk-[A-Za-z0-9_\\-]{10,}"

- id: secret-slack-bot
  message: "Likely Slack bot token hardcoded (xoxb-...)."
  languages: [javascript, typescript]
  severity: HIGH
  pattern-regex: "xoxb-[A-Za-z0-9_\\-]{10,}"

- id: mongoose-plaintext-password
  message: "Password field stored as String (plaintext). Hash and add proper auth."
  languages: [javascript, typescript]
  severity: HIGH
  pattern-either:
    - pattern-regex: "password\\s*:\\s*String"
    - pattern-regex: "password\\s*:\\s*\\{\\s*type\\s*:\\s*String"
`
    tmpConfigPath = path.join(process.cwd(), `.semgrep-fallback-${Date.now()}.yaml`)
    fs.writeFileSync(tmpConfigPath, FALLBACK_RULES, "utf8")
    configs = [tmpConfigPath]
    warnings.push("Using embedded fallback rules (no YAML files found under rules/).")
  }

  const semgrepBin = resolveSemgrepBin()
  const args = ["--json", "--no-git-ignore", "--timeout", "120"]
  for (const c of configs) args.push("--config", c)
  args.push(repoPath)

  const res = await execp(semgrepBin, args)
  if (tmpConfigPath) { try { fs.unlinkSync(tmpConfigPath) } catch {} }

  if (res.code !== 0 && !res.stdout.trim()) {
    warnings.push("Semgrep failed to run.")
    return { findings: [] as Finding[], warnings, ran: false }
  }

  let findings: Finding[] = []
  try {
    const json = JSON.parse(res.stdout || "{}")
    const results = Array.isArray(json.results) ? json.results : []
    findings = results.map((r: any) => ({
      tool: "semgrep",
      severity: String(r?.extra?.severity || "UNKNOWN").toUpperCase(),
      file: relToRepo(repoPath, r?.path || ""),
      line: r?.start?.line || r?.start?.position?.line,
      ruleId: r?.check_id || r?.id,
      title: r?.extra?.message || r?.check_id,
      message: r?.extra?.metadata?.message || r?.extra?.lines || r?.extra?.message || ""
    }))
  } catch {
    warnings.push("Failed to parse Semgrep JSON.")
  }

  return { findings, warnings, ran: true }
}

function walkFiles(root: string, exts = [".js", ".jsx", ".ts", ".tsx"]) {
  const out: string[] = []
  const skipDirs = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next"])
  const stack = [root]
  while (stack.length) {
    const d = stack.pop()!
    let items: string[] = []
    try { items = fs.readdirSync(d) } catch { continue }
    for (const name of items) {
      const fp = path.join(d, name)
      let st: fs.Stats
      try { st = fs.statSync(fp) } catch { continue }
      if (st.isDirectory()) {
        if (!skipDirs.has(name)) stack.push(fp)
      } else {
        if (exts.includes(path.extname(name))) out.push(fp)
      }
    }
  }
  return out
}

function fallbackRegexScan(repoPath: string): Finding[] {
  const files = walkFiles(repoPath)
  const findings: Finding[] = []

  const rules: { id: string; title: string; sev: "HIGH"|"MEDIUM"; test: (line: string) => boolean }[] = [
    { id: "js-eval-detected", title: "Avoid using eval()", sev: "MEDIUM", test: l => /\beval\s*\(/i.test(l) },
    { id: "js-dangerous-child-process", title: "Dangerous child_process execution", sev: "HIGH",
      test: l => /(child_process|execSync|spawn\s*\(|\bexec\s*\()/i.test(l) && !/\/\/\s*safe-ignore/i.test(l) },
    { id: "express-cors-any-origin", title: "CORS allows any origin", sev: "MEDIUM",
      test: l => /app\.use\s*\(\s*cors\s*\(/i.test(l) || /origin\s*:\s*["']\*/i.test(l) },
    { id: "react-dangerously-set-inner-html", title: "dangerouslySetInnerHTML used (XSS risk)", sev: "MEDIUM",
      test: l => /dangerouslySetInnerHTML\s*=/i.test(l) },
    { id: "secret-openai-key", title: "Likely OpenAI API key hardcoded", sev: "HIGH",
      test: l => /sk-[A-Za-z0-9_\-]{10,}/.test(l) },
    { id: "secret-slack-bot", title: "Likely Slack bot token hardcoded", sev: "HIGH",
      test: l => /xoxb-[A-Za-z0-9_\-]{10,}/.test(l) },
    { id: "mongoose-plaintext-password", title: "Password stored as plaintext String", sev: "HIGH",
      test: l => /password\s*:\s*String/i.test(l) || /password\s*:\s*\{\s*type\s*:\s*String/i.test(l) },
  ]

  for (const fp of files) {
    let content = ""
    try { content = fs.readFileSync(fp, "utf8") } catch { continue }
    const lines = content.split(/\r?\n/)
    lines.forEach((line, idx) => {
      for (const r of rules) {
        if (r.test(line)) {
          findings.push({
            tool: "regex",
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

async function banditAvailable() { return (await execp("bandit", ["--version"])).code === 0 }
async function runBandit(repoPath: string) {
  const ok = await banditAvailable()
  if (!ok) return { findings: [] as Finding[], ran: false, warnings: ["bandit not found in PATH — skipping bandit scan"] }
  const res = await execp("bandit", ["-r", repoPath, "-f", "json"])
  if (res.code !== 0) return { findings: [], ran: true, warnings: ["bandit failed"] }

  let findings: Finding[] = []
  try {
    const json = JSON.parse(res.stdout || "{}")
    const results = Array.isArray(json.results) ? json.results : []
    findings = results.map((r: any) => ({
      tool: "bandit",
      severity: String(r?.issue_severity || "UNKNOWN").toUpperCase() as any,
      file: relToRepo(repoPath, r?.filename || ""),
      line: r?.line_number,
      ruleId: r?.test_id,
      title: r?.test_name,
      message: r?.issue_text
    }))
  } catch {}
  return { findings, ran: true, warnings: [] as string[] }
}

function usage() { console.log('Usage: node dist/cli.js --path "C:\\path\\repo"') }

async function main() {
  const argv = Object.fromEntries(
    process.argv.slice(2).map((a, i, arr) => a.startsWith("--") ? [a.replace(/^--/, ""), arr[i+1]] : []).filter(Boolean)
  ) as any
  const repoPath = String(argv.path || "").trim()
  if (!repoPath) { usage(); process.exit(2); return }

  const sem = await runSemgrep(repoPath)
  const ban = await runBandit(repoPath)

  let findings = [...sem.findings, ...ban.findings]

  // If Semgrep+Bandit found nothing, use the fallback regex scan
  if (findings.length === 0) {
    const regexFindings = fallbackRegexScan(repoPath)
    findings = regexFindings
  }

  const highCount = findings.filter(f => f.severity === "HIGH").length
  const out = {
    findings,
    warnings: [...(sem.warnings || []), ...(ban.warnings || [])],
    stats: { semgrepRan: sem.ran, banditRan: ban.ran, highCount, total: findings.length }
  }
  process.stdout.write(JSON.stringify(out, null, 2))
}

main().catch(e => { console.error(e); process.exit(2) })

import * as path from 'node:path'
import { execCapture, which, mapSeverity } from './utils.js'
import type { Finding } from './types.js'

export interface SemgrepConfig {
  rulesFile: string // local yaml rules
  exclude?: string[]
  timeoutSeconds?: number
}

interface SemgrepJSON {
  results: Array<{
    check_id: string
    path: string
    start: { line: number }
    extra?: {
      message?: string
      metadata?: { cwe?: string; owasp?: string; references?: string[]; fix?: string }
      severity?: string
    }
  }>
}

export async function runSemgrep(targetPath: string, cfg: SemgrepConfig): Promise<{ findings: Finding[], warnings: string[] }> {
  const warnings: string[] = []
  const semgrepPath = await which('semgrep')
  if (!semgrepPath) {
    warnings.push('semgrep not found in PATH — skipping semgrep scan')
    return { findings: [], warnings }
  }

  const args = [
    '--config', path.resolve(cfg.rulesFile),
    '--json',
    '--timeout', String(cfg.timeoutSeconds ?? 0),
    targetPath,
  ]

  if (cfg.exclude && cfg.exclude.length) {
    for (const e of cfg.exclude) {
      args.push('--exclude', e)
    }
  }

  const { code, stdout, stderr } = await execCapture('semgrep', args, targetPath)
  if (code !== 0 && code !== 1) { // semgrep returns 1 when findings found
    warnings.push(`semgrep exited with code ${code}: ${stderr.trim()}`)
    return { findings: [], warnings }
  }

  let parsed: SemgrepJSON
  try {
    parsed = JSON.parse(stdout)
  } catch (e) {
    warnings.push('Failed to parse semgrep JSON output')
    return { findings: [], warnings }
  }

  const findings: Finding[] = (parsed.results || []).map(r => ({
    tool: 'semgrep',
    severity: mapSeverity(r.extra?.severity || 'LOW'),
    file: path.relative(process.cwd(), path.resolve(targetPath, r.path)),
    line: r.start?.line || 1,
    ruleId: r.check_id,
    title: r.extra?.message || r.check_id,
    message: r.extra?.message || '',
    remediation: r.extra?.metadata?.fix
  }))

  return { findings, warnings }
}

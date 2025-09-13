import * as path from 'node:path'
import { execCapture, which, mapSeverity } from './utils.js'
import type { Finding } from './types.js'

interface BanditJSON {
  results: Array<{
    filename: string
    test_id: string
    issue_severity: string
    issue_text: string
    line_number: number
  }>
}

export async function runBandit(targetPath: string): Promise<{ findings: Finding[], warnings: string[] }> {
  const warnings: string[] = []
  const banditPath = await which('bandit')
  if (!banditPath) {
    warnings.push('bandit not found in PATH — skipping bandit scan')
    return { findings: [], warnings }
  }
  const { code, stdout, stderr } = await execCapture('bandit', ['-r', '.', '-f', 'json'], targetPath)
  if (code !== 0 && code !== 1) {
    warnings.push(`bandit exited with code ${code}: ${stderr.trim()}`)
    return { findings: [], warnings }
  }
  let parsed: BanditJSON
  try {
    parsed = JSON.parse(stdout)
  } catch {
    warnings.push('Failed to parse bandit JSON output')
    return { findings: [], warnings }
  }
  const findings: Finding[] = (parsed.results || []).map(r => ({
    tool: 'bandit',
    severity: mapSeverity(r.issue_severity || 'LOW'),
    file: path.relative(process.cwd(), path.resolve(targetPath, r.filename)),
    line: r.line_number || 1,
    ruleId: r.test_id,
    title: r.issue_text.slice(0, 80),
    message: r.issue_text
  }))
  return { findings, warnings }
}

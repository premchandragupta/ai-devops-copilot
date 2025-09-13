export type Severity = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Finding {
  tool: 'semgrep' | 'bandit'
  severity: Severity
  file: string
  line: number
  ruleId: string
  title: string
  message: string
  remediation?: string
}

export interface ScanResult {
  findings: Finding[]
  warnings: string[]
  stats: {
    semgrepRan: boolean
    banditRan: boolean
    highCount: number
    total: number
  }
}

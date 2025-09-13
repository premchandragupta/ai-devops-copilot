import * as fs from 'node:fs'
import * as path from 'node:path'
import { runSemgrep } from './semgrep.js'
import { runBandit } from './bandit.js'
import type { ScanResult } from './types.js'

interface EngineConfig {
  semgrep: {
    rulesFile: string
    exclude?: string[]
    timeoutSeconds?: number
  }
  bandit: {
    enabled: boolean
  }
}

export async function scan(targetPath: string, configPath?: string): Promise<ScanResult> {
  const isDir = fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()
  if (!isDir) throw new Error(`Scan path not found or not a directory: ${targetPath}`)

  const defaultConfigPath = path.resolve(process.cwd(), 'config', 'defaults.json')
  const cfg: EngineConfig = JSON.parse(fs.readFileSync(configPath ?? defaultConfigPath, 'utf-8'))

  const allFindings = []
  const allWarnings: string[] = []

  // SEMGREP
  const { findings: sFindings, warnings: sWarn } = await runSemgrep(targetPath, cfg.semgrep)
  allFindings.push(...sFindings)
  allWarnings.push(...sWarn)

  // BANDIT (optional)
  let banditRan = false
  if (cfg.bandit.enabled) {
    const { findings: bFindings, warnings: bWarn } = await runBandit(targetPath)
    banditRan = true
    allFindings.push(...bFindings)
    allWarnings.push(...bWarn)
  }

  const highCount = allFindings.filter(f => f.severity === 'HIGH').length
  const res: ScanResult = {
    findings: allFindings,
    warnings: allWarnings,
    stats: {
      semgrepRan: true,
      banditRan,
      highCount,
      total: allFindings.length
    }
  }
  return res
}

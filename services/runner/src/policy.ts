import * as fs from 'node:fs'
import * as path from 'node:path'
import { execCapture } from './utils.js'

export function findPolicyEngine(): { cmd: string, args: string[] } {
  const override = process.env.POLICY_ENGINE_CLI
  if (override && fs.existsSync(override)) {
    return { cmd: process.execPath, args: [override] }
  }
  const candidate = path.resolve(process.cwd(), '..', 'policy-engine', 'dist', 'cli.js')
  if (fs.existsSync(candidate)) {
    return { cmd: process.execPath, args: [candidate] }
  }
  // Fallback to a global binary (if you ran pnpm link --global)
  return { cmd: 'policy-engine', args: [] }
}

export async function runPolicyScan(repoPath: string): Promise<{ code:number, json:any, stderr:string }> {
  const { cmd, args } = findPolicyEngine()
  const full = [...args, '--path', repoPath]
  const r = await execCapture(cmd, full, process.cwd())
  if (r.code === 0 || r.code === 1) {
    try {
      const parsed = JSON.parse(r.stdout)
      return { code: r.code, json: parsed, stderr: r.stderr }
    } catch {
      throw new Error('policy-engine returned non-JSON output')
    }
  }
  throw new Error(`policy-engine failed (exit ${r.code}): ${r.stderr}`)
}

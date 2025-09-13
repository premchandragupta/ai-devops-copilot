import { spawn } from 'node:child_process'
import * as path from 'node:path'
import * as fs from 'node:fs'

export interface ExecOptions {
  cwd?: string
  timeoutMs?: number
  maxBuffer?: number
}

export function findPolicyEngineCli(): { cmd: string, args: string[] } {
  // Allow override via env; else point to monorepo policy-engine dist CLI; else fallback to binary on PATH
  const override = process.env.POLICY_ENGINE_CLI
  if (override) {
    return { cmd: process.execPath, args: [override] } // run with node <path/to/cli.js>
  }

  // Relative path: services/policy-engine/dist/cli.js (from compiled dist folder)
  // __dirname: .../services/api-gateway/dist/scan
  const candidate = path.resolve(__dirname, '../../../policy-engine/dist/cli.js')
  if (fs.existsSync(candidate)) {
    return { cmd: process.execPath, args: [candidate] }
  }

  // Fallback: try the binary name if user linked it globally
  return { cmd: 'policy-engine', args: [] }
}

export async function execPolicyEngine(args: string[], options: ExecOptions = {}): Promise<{ code:number, stdout:string, stderr:string }> {
  const { cmd, args: baseArgs } = findPolicyEngineCli()
  const fullArgs = [...baseArgs, ...args]

  return new Promise((resolve) => {
    const child = spawn(cmd, fullArgs, { cwd: options.cwd, shell: false })
    let stdout = ''
    let stderr = ''
    const max = options.maxBuffer ?? 10 * 1024 * 1024 // 10MB
    const timer = options.timeoutMs ? setTimeout(() => {
      try { child.kill('SIGKILL') } catch {}
      stderr += '\n[scan] timed out'
      resolve({ code: -1, stdout, stderr })
    }, options.timeoutMs) : null

    child.stdout.on('data', (d) => {
      stdout += d.toString()
      if (stdout.length > max) { try { child.kill('SIGKILL') } catch {} }
    })
    child.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    child.on('error', (err) => resolve({ code: -1, stdout, stderr: String(err) }))
    child.on('close', (code) => {
      if (timer) clearTimeout(timer as any)
      resolve({ code: code ?? -1, stdout, stderr })
    })
  })
}

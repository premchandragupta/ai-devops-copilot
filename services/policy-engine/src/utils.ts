import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

export function fileExists(p: string): boolean {
  try { fs.accessSync(p); return true } catch { return false }
}

export function resolveFromRoot(...parts: string[]): string {
  // Resolve relative to package root (where this file is after compilation: dist/.. -> root)
  const root = path.resolve(process.cwd())
  return path.resolve(root, ...parts)
}

export async function execCapture(cmd: string, args: string[], cwd?: string): Promise<{code:number, stdout:string, stderr:string}> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: false })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', d => stdout += d.toString())
    child.stderr.on('data', d => stderr += d.toString())
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }))
    child.on('error', (err) => resolve({ code: -1, stdout, stderr: String(err) }))
  })
}

export async function which(binary: string): Promise<string | null> {
  // cross-platform check for binary in PATH
  const isWin = process.platform === 'win32'
  const cmd = isWin ? 'where' : 'which'
  const { code, stdout } = await execCapture(cmd, [binary])
  if (code === 0) {
    const first = stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0]
    return first || null
  }
  return null
}

export function mapSeverity(s: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  const u = s.toUpperCase()
  if (u.includes('CRITICAL') || u === 'ERROR' || u === 'HIGH') return 'HIGH'
  if (u === 'MEDIUM' || u === 'WARNING' || u === 'WARN') return 'MEDIUM'
  return 'LOW'
}

import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

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
  const isWin = process.platform === 'win32'
  const cmd = isWin ? 'where' : 'which'
  const { code, stdout } = await execCapture(cmd, [binary])
  if (code === 0) {
    const first = stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0]
    return first || null
  }
  return null
}

export function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true })
}

export function writeJson(file: string, data: any) {
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

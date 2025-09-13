import * as fs from 'node:fs'
import * as path from 'node:path'
import { execCapture } from './utils.js'

export async function assertGitRepo(repo: string) {
  if (!fs.existsSync(repo) || !fs.statSync(repo).isDirectory()) {
    throw new Error(`Repo not found or not a directory: ${repo}`)
  }
  const gitDir = path.resolve(repo, '.git')
  if (!fs.existsSync(gitDir)) {
    throw new Error(`Not a git repository: ${repo}`)
  }
}

export async function getChangedFiles(repo: string, base: string, head: string) {
  // List changed files (Added, Copied, Modified)
  const namesRes = await execCapture('git', ['-C', repo, 'diff', '--name-only', '--diff-filter=ACM', `${base}..${head}`])
  if (namesRes.code !== 0) throw new Error(`git diff name-only failed: ${namesRes.stderr}`)
  const files = namesRes.stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean)

  // Determine binaries via numstat (binary shows '-' columns)
  const numstatRes = await execCapture('git', ['-C', repo, 'diff', '--numstat', `${base}..${head}`])
  if (numstatRes.code !== 0) throw new Error(`git diff numstat failed: ${numstatRes.stderr}`)
  const binarySet = new Set<string>()
  for (const line of numstatRes.stdout.split(/\r?\n/)) {
    if (!line.trim()) continue
    const parts = line.split(/\t/)
    if (parts.length >= 3) {
      const add = parts[0].trim()
      const del = parts[1].trim()
      const file = parts.slice(2).join('\t').trim() // support tabs in filename
      if (add === '-' || del === '-') {
        binarySet.add(file)
      }
    }
  }

  return files.map(f => ({ path: f, isBinary: binarySet.has(f) }))
}

export async function getFileDiff(repo: string, base: string, head: string, filePath: string, maxBytes = 200 * 1024) {
  const res = await execCapture('git', ['-C', repo, 'diff', `${base}..${head}`, '--', filePath])
  if (res.code !== 0) throw new Error(`git diff for ${filePath} failed: ${res.stderr}`)
  let diff = res.stdout || ''
  if (Buffer.byteLength(diff, 'utf-8') > maxBytes) {
    diff = diff.slice(0, maxBytes) + '\n... [truncated]'
  }
  return diff
}

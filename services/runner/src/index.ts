import * as fs from 'node:fs'
import * as path from 'node:path'
import { assertGitRepo, getChangedFiles, getFileDiff } from './git.js'
import { runPolicyScan } from './policy.js'
import { generateSuggestions } from './llm.js'

export interface AnalyzeOptions {
  repo: string
  base: string
  head: string
  outDir?: string
}

export async function analyze(opts: AnalyzeOptions) {
  const repo = path.resolve(opts.repo)
  await assertGitRepo(repo)
  const changed = await getChangedFiles(repo, opts.base, opts.head)
  const textFiles = changed.filter(f => !f.isBinary)

  const diffs: Array<{file:string, diff:string}> = []
  for (const f of textFiles) {
    const diff = await getFileDiff(repo, opts.base, opts.head, f.path)
    diffs.push({ file: f.path, diff })
  }

  // call policy engine on the repo
  let policyCode = 2, policyJson: any = null, policyErr = ''
  try {
    const res = await runPolicyScan(repo)
    policyCode = res.code
    policyJson = res.json
    policyErr = res.stderr
  } catch (e: any) {
    policyErr = e?.message || String(e)
  }

  // mock LLM suggestions
  const llm = await generateSuggestions(diffs)

  const comments = []
  for (const s of llm) {
    for (const c of s.comments) {
      comments.push({ file: s.file, line: c.line, body: c.body })
    }
  }
  if (policyJson && policyJson.findings) {
    for (const f of policyJson.findings.slice(0, 10)) {
      comments.push({ file: f.file || 'unknown', line: f.line || 1, body: `[${f.tool.toUpperCase()}] ${f.severity}: ${f.title}` })
    }
  }

  const result = {
    repo,
    base: opts.base,
    head: opts.head,
    changedFiles: changed,
    static: policyJson,
    staticExit: policyCode,
    staticError: policyErr,
    llm,
    comments
  }

  const outDir = path.resolve(opts.outDir || path.join(process.cwd(), 'reports'))
  fs.mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outFile = path.join(outDir, `analysis-${stamp}.json`)
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf-8')

  // Summary to console
  const highCount = policyJson?.stats?.highCount ?? 0
  console.log(`[runner] analyzed ${changed.length} files (${textFiles.length} text)`)
  console.log(`[runner] policy-engine highCount=${highCount}, total=${policyJson?.stats?.total ?? 0}`)
  console.log(`[runner] comments: ${comments.length}`)
  console.log(`[runner] report saved: ${outFile}`)

  // Exit code: 1 if HIGH findings; 0 otherwise
  const exitCode = highCount > 0 ? 1 : 0
  return { exitCode, outFile, result }
}

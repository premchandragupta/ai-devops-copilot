// Integrated CLI: runs analysis and then posts to Slack/Jira/GitHub.
import path from 'node:path'
import process from 'node:process'
import minimist from 'minimist'
import { sendAuditEvent } from './integrations/audit.js'
import { postIntegrations } from './integrations/postActions.js'

type Args = {
  repo?: string
  base?: string
  head?: string
  outDir?: string
  [k: string]: any
}

function usage() {
  console.log('Usage: pnpm run analyze -- --repo C\\path\\repo --base <sha> --head <sha> [--outDir reports]')
}

async function resolveAnalyze() {
  const candidates = [
    './analyzerCompat.js', // NEW – our robust fallback
    './runner.js',
    './analyzer.js',
    './index.js',
    './main.js'
  ]
  for (const c of candidates) {
    try {
      const mod = await import(c)
      if (typeof (mod as any).analyzeRepoDiff === 'function') return (mod as any).analyzeRepoDiff
      if (typeof (mod as any).analyze === 'function') return (mod as any).analyze
    } catch {}
  }
  throw new Error('Could not find analyze function. Looked for analyzeRepoDiff/analyze in analyzerCompat|runner|analyzer|index|main.')
}

async function main() {
  const argv = minimist(process.argv.slice(2))
  const args: Args = {
    repo: argv.repo || argv.r,
    base: argv.base || argv.b,
    head: argv.head || argv.h,
    outDir: argv.outDir || argv.o || path.resolve(process.cwd(), 'reports')
  }
  if (!args.repo || !args.base || !args.head) {
    usage()
    process.exit(2)
    return
  }

  await sendAuditEvent({ type: 'runner.start', args })

  let exitCode = 0
  let result: any = {}
  try {
    const analyze = await resolveAnalyze()
    const res = await analyze({
      repoPath: args.repo,
      baseSha: args.base,
      headSha: args.head,
      outDir: args.outDir
    })
    result = (res && res.result) ? res.result : (res ?? {})
    exitCode = (res && typeof res.exitCode === 'number') ? res.exitCode : 0
  } catch (e: any) {
    console.error('[runner] analyze error:', e?.message || String(e))
    exitCode = 2
  }

  try {
    await postIntegrations({ headSha: args.head, result, exitCode })
  } catch (e: any) {
    console.error('[runner] postIntegrations error:', e?.message || String(e))
  }

  await sendAuditEvent({
    type: 'runner.finish',
    summary: { exitCode, totalFindings: (result.findings ?? []).length }
  })

  process.exit(exitCode)
}

main().catch(e => { console.error('[fatal]', e); process.exit(2) })

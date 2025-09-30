import path from 'node:path'
import process from 'node:process'
import minimist from 'minimist'
import "./integrations/envloader.js";
import { sendAuditEvent } from './integrations/audit.js'
import { postIntegrations } from './integrations/postActions.js'
import { analyzeRepoDiff } from './analyzerCompat.js'

type Args = {
  repo?: string; base?: string; head?: string; outDir?: string; full?: boolean; [k: string]: any
}

function usage() {
  console.log('Usage: pnpm run analyze -- --repo C\\path\\repo --base <sha> --head <sha> [--outDir reports] [--full]')
}

async function main() {
  const argv = minimist(process.argv.slice(2))
  const args: Args = {
    repo: argv.repo || argv.r,
    base: argv.base || argv.b,
    head: argv.head || argv.h,
    outDir: argv.outDir || argv.o || path.resolve(process.cwd(), 'reports'),
    full: Boolean(argv.full) || process.env.RUNNER_FULL_SCAN === '1'
  }
  if (!args.repo || !args.base || !args.head) { usage(); process.exit(2); return }

  await sendAuditEvent({ type: 'runner.start', args: { ...args, repo: args.repo } })

  let exitCode = 0; let result: any = {}
  try {
    const res = await analyzeRepoDiff({ repoPath: args.repo!, baseSha: args.base!, headSha: args.head!, outDir: args.outDir!, fullScan: args.full! })
    result = res?.result ?? {}
    exitCode = typeof res?.exitCode === 'number' ? res.exitCode : 0
  } catch (e: any) {
    console.error('[runner] analyze error:', e?.message || String(e))
    exitCode = 2
  }

  try { await postIntegrations({ headSha: args.head!, result, exitCode }) } catch (e: any) { console.error('[runner] postIntegrations error:', e?.message || String(e)) }

  const findings = Array.isArray(result.findings) ? result.findings : []
  const total = findings.length
  const high = findings.filter((f: any) => (f.severity || '').toUpperCase() === 'HIGH').length
  const report = result.reportPath ? ` report=${result.reportPath}` : ''
  console.log(`[runner] done. findings=${total} (HIGH=${high}) exit=${exitCode}${report}`)
  process.exit(exitCode)
}

main().catch(e => { console.error('[fatal]', e); process.exit(2) })

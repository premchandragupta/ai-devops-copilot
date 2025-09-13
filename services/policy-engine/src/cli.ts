#!/usr/bin/env node
import * as fs from 'node:fs'
import * as path from 'node:path'
import { scan } from './index.js'

function parseArgs() {
  const args = process.argv.slice(2)
  const out: any = { path: undefined, config: undefined, outFile: undefined }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--path' && args[i+1]) out.path = args[++i]
    else if (a === '--config' && args[i+1]) out.config = args[++i]
    else if (a === '--out' && args[i+1]) out.outFile = args[++i]
  }
  return out
}

async function main() {
  const args = parseArgs()
  if (!args.path) {
    console.error('Usage: policy-engine --path <repoPath> [--config config/defaults.json] [--out report.json]')
    process.exit(2)
  }
  const target = path.resolve(process.cwd(), args.path)
  try {
    const result = await scan(target, args.config ? path.resolve(process.cwd(), args.config) : undefined)
    const json = JSON.stringify(result, null, 2)
    if (args.outFile) {
      fs.writeFileSync(path.resolve(process.cwd(), args.outFile), json, 'utf-8')
      console.log(`Report written to ${args.outFile}`)
    } else {
      console.log(json)
    }
    // Exit code policy: HIGH findings => 1, else 0
    process.exit(result.stats.highCount > 0 ? 1 : 0)
  } catch (e: any) {
    console.error(`[policy-engine] Error: ${e?.message || String(e)}`)
    process.exit(2)
  }
}

main().catch((e) => {
  console.error('[policy-engine] Fatal:', e)
  process.exit(2)
})

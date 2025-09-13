import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load root .env (repo root, 3-4 levels up from services/runner/dist/integrations)
const ROOT = path.resolve(__dirname, '../../../..')
const envFile = path.join(ROOT, '.env')
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile })
} else {
  dotenv.config() // fallback to process.cwd()/.env if present
}

export function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v || !String(v).trim()) {
    throw new Error(`Missing required env: ${name}`)
  }
  return String(v)
}

export function optionalEnv(name: string): string | undefined {
  const v = process.env[name]
  return v && String(v).trim() ? String(v) : undefined
}

export function summarizeEnv(names: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const n of names) {
    const present = process.env[n] && String(process.env[n]).trim() ? 'set' : 'missing'
    out[n] = present
  }
  return out
}

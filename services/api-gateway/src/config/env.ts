import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Try load .env from common locations (service/.env, repo/.env)
const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(process.cwd(), '..', '..', '.env'),
  path.resolve(process.cwd(), '..', '..', '..', '.env'),
]

for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p })
    break
  }
}

export const env = {
  POSTGRES_URL: process.env.POSTGRES_URL || '',
  PORT: process.env.PORT ? Number(process.env.PORT) : 3001,
}
if (!env.POSTGRES_URL) {
  // We won't throw here to allow prisma migrate to set it via CLI env
  // but we log a helpful hint.
  // eslint-disable-next-line no-console
  console.warn('[env] POSTGRES_URL is not set. Set it in your repo root .env.')
}

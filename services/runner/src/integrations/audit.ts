import { optionalEnv } from './env.js'

let warnedOnce = false

export async function sendAuditEvent(payload: any) {
  try {
    // Allow opt-out via env var
    if (optionalEnv('NO_AUDIT_LOG')) return

    const url = optionalEnv('AUDIT_LOG_URL') || 'http://localhost:4003/events'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ts: new Date().toISOString(), ...payload })
    })

    if (!res.ok && !warnedOnce) {
      warnedOnce = true
      console.warn(`[audit] disabled (HTTP ${res.status}) at ${url}`)
    }
  } catch {
    if (!warnedOnce) {
      warnedOnce = true
      console.warn('[audit] disabled (fetch failed)')
    }
  }
}

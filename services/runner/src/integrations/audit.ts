import { optionalEnv } from './env.js'

export interface AuditEvent {
  app?: string
  type: string
  [key: string]: any
}

export async function sendAuditEvent(event: AuditEvent): Promise<void> {
  const url = optionalEnv('AUDIT_LOG_URL') ?? 'http://localhost:4003/events'
  const payload = { events: [{ app: 'runner', ...event }] }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (e: any) {
    console.error('[audit] warn:', e?.message || String(e))
  }
}

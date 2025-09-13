import { Injectable } from '@nestjs/common'

@Injectable()
export class AuditService {
  private url = process.env.AUDIT_LOG_URL || 'http://localhost:4003/events'

  async emit(type: string, data: Record<string, any> = {}) {
    const payload = { events: [{ app: 'api-gateway', type, ...data }] }
    try {
      await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (e) {
      console.error('[audit] warn:', (e as any)?.message || String(e))
    }
  }
}

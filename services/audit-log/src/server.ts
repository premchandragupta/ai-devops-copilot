import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import client from 'prom-client'

const app = express()
app.use(express.json({ limit: '2mb' }))

const PORT = Number(process.env.PORT || 4003)
const LOG_FILE = process.env.AUDIT_LOG_FILE || path.resolve(process.cwd(), 'logs', 'audit.log')

fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true })

const registry = new client.Registry()
client.collectDefaultMetrics({ register: registry })
const eventsCounter = new client.Counter({
  name: 'audit_events_total',
  help: 'Total number of audit events received',
  labelNames: ['type', 'app']
})
const httpReqCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP requests total',
  labelNames: ['route','method','status']
})
registry.registerMetric(eventsCounter)
registry.registerMetric(httpReqCounter)

function logLine(obj: Record<string, any>) {
  const line = JSON.stringify(obj) + '\n'
  fs.appendFileSync(LOG_FILE, line, 'utf8')
  console.log(line.trim())
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType)
  res.end(await registry.metrics())
})

app.post('/events', (req, res) => {
  const now = new Date().toISOString()
  let events: any[] = []
  if (Array.isArray(req.body?.events)) {
    events = req.body.events
  } else if (Array.isArray(req.body)) {
    events = req.body
  } else if (req.body && typeof req.body === 'object') {
    events = [req.body]
  } else {
    res.status(400).json({ error: 'expected body { events: [...] } or an array/object' })
    return
  }

  for (const e of events) {
    const evt = { ts: now, app: e.app || 'unknown', type: e.type || 'unknown', ...e }
    const redacted = { ...evt }
    for (const k of Object.keys(redacted)) {
      if (/token|secret|password|api[_-]?key/i.test(k)) {
        redacted[k] = '[REDACTED]'
      }
    }
    eventsCounter.inc({ type: redacted.type, app: redacted.app })
    logLine(redacted)
  }

  httpReqCounter.inc({ route: '/events', method: 'POST', status: '200' })
  res.json({ ok: true, received: events.length })
})

app.use((req, res) => {
  httpReqCounter.inc({ route: req.path, method: req.method, status: '404' })
  res.status(404).json({ error: 'not found' })
})

app.listen(PORT, () => {
  console.log(`[audit-log] listening on :${PORT}, file=${LOG_FILE}`)
})

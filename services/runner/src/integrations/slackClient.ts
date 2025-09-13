import { WebClient } from '@slack/web-api'
import { requireEnv, optionalEnv } from './env.js'
import { withBackoff } from './backoff.js'

let _client: WebClient | null = null

export function slackClient(): WebClient {
  if (_client) return _client
  const token = requireEnv('SLACK_BOT_TOKEN')
  _client = new WebClient(token, {
    // Never log payloads or tokens
    logLevel: (optionalEnv('SLACK_LOG_LEVEL') as any) ?? undefined
  })
  return _client
}

export async function slackHealth(): Promise<boolean> {
  const client = slackClient()
  const res = await withBackoff(() => client.auth.test())
  return Boolean((res as any).ok)
}

export async function postMessage(channel: string, text: string): Promise<string> {
  const client = slackClient()
  const res = await withBackoff(() => client.chat.postMessage({ channel, text }))
  return (res as any).ts as string
}

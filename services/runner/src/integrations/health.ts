import { summarizeEnv } from './env.js'
import { slackHealth } from './slackClient.js'
import { jiraHealthVerbose } from './jiraClient.js'

async function main() {
  const vars = [
    'SLACK_BOT_TOKEN', 'SLACK_CHANNEL_ID',
    'JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN', 'JIRA_PROJECT_KEY',
    'APP_ID', 'PRIVATE_KEY', 'PRIVATE_KEY_PATH'
  ]
  const summary = summarizeEnv(vars)
  console.log('[env] variables presence:', summary)

  let ok = true
  try {
    const s = await slackHealth()
    console.log('[slack] health:', s ? 'ok' : 'fail')
    if (!s) ok = false
  } catch (e: any) {
    console.error('[slack] error:', e.message || String(e))
    ok = false
  }

  try {
    const j = await jiraHealthVerbose()
    if (j.ok) {
      console.log('[jira] health: ok')
    } else {
      console.log('[jira] health: fail', { status: j.status, hint: (j.text || '').slice(0, 120) })
      ok = false
    }
  } catch (e: any) {
    console.error('[jira] error:', e.message || String(e))
    ok = false
  }

  process.exit(ok ? 0 : 2)
}

main().catch(e => { console.error('[health] fatal:', e); process.exit(2) })

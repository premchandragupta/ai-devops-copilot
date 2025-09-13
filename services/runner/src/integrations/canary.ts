import { summarizeEnv, optionalEnv, requireEnv } from './env.js'
import { slackHealth, postMessage } from './slackClient.js'
import { jiraHealth, createIssue, deleteIssue } from './jiraClient.js'

async function main() {
  // Never print secrets; only presence
  const vars = [
    'SLACK_BOT_TOKEN', 'SLACK_CHANNEL_ID',
    'JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN', 'JIRA_PROJECT_KEY',
    'APP_ID', 'PRIVATE_KEY', 'PRIVATE_KEY_PATH'
  ]
  const summary = summarizeEnv(vars)
  console.log('[env] variables presence:', summary)

  let ok = true

  // Slack
  try {
    const healthy = await slackHealth()
    console.log('[slack] health:', healthy ? 'ok' : 'fail')
    if (healthy) {
      const channel = requireEnv('SLACK_CHANNEL_ID')
      const ts = await postMessage(channel, `canary: runner integrations OK at ${new Date().toISOString()}`)
      console.log('[slack] posted test message ts=', ts)
    } else {
      ok = false
    }
  } catch (e: any) {
    console.error('[slack] error:', e.message || String(e))
    ok = false
  }

  // Jira
  try {
    const healthy = await jiraHealth()
    console.log('[jira] health:', healthy ? 'ok' : 'fail')
    if (healthy) {
      const issue = await createIssue('canary - test issue (auto-delete)', 'This is a temporary canary issue created by runner.')
      console.log('[jira] created:', issue.key)
      await deleteIssue(issue.id || issue.key)
      console.log('[jira] deleted:', issue.key)
    } else {
      ok = false
    }
  } catch (e: any) {
    console.error('[jira] error:', e.message || String(e))
    ok = false
  }

  process.exit(ok ? 0 : 2)
}

main().catch(e => { console.error('[canary] fatal:', e); process.exit(2) })

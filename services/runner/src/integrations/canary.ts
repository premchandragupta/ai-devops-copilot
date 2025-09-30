// ESM, Node 22+
// Posts a Slack canary message and creates+deletes a Jira canary issue (if configured).
import "./envloader.js";
import process from "node:process"
import { postMessage } from "./slackClient.js"
import { createIssue, deleteIssue, health as jiraHealth } from "./jiraClient.js"

function hasSlackEnv() {
  return !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID)
}
function hasJiraEnv() {
  return !!(
    process.env.JIRA_BASE_URL &&
    process.env.JIRA_EMAIL &&
    process.env.JIRA_API_TOKEN &&
    process.env.JIRA_PROJECT_KEY
  )
}

async function main() {
  let ok = true

  // Slack
  if (hasSlackEnv()) {
    try {
      const ch = process.env.SLACK_CHANNEL_ID!
      await postMessage(ch, ":white_check_mark: AI DevOps canary: Slack is reachable.")
      console.log("[canary] Slack OK")
    } catch (e: any) {
      ok = false
      console.error("[canary] Slack error:", e?.message || String(e))
    }
  } else {
    console.log("[canary] Slack skipped (env not set)")
  }

  // Jira
  if (hasJiraEnv()) {
    try {
      const healthy = await jiraHealth()
      if (!healthy) throw new Error("Jira health=false")
      const issue = await createIssue({
        summary: "canary - test issue (auto-delete)",
        descriptionText: "This is a temporary canary issue created by runner."
      })
      console.log("[canary] Jira create OK:", issue.key)
      await deleteIssue(issue.key)
      console.log("[canary] Jira delete OK:", issue.key)
    } catch (e: any) {
      ok = false
      console.error("[canary] Jira error:", e?.message || String(e))
    }
  } else {
    console.log("[canary] Jira skipped (env not set)")
  }

  process.exit(ok ? 0 : 2)
}

main().catch(e => { console.error("[canary] fatal", e); process.exit(2) })

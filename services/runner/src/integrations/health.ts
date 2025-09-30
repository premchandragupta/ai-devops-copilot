// ESM, Node 22+
// Prints presence of env vars and does light health checks for Slack & Jira.
import "./envloader.js";
import process from "node:process"
import { health as jiraHealth } from "./jiraClient.js"

function presence(name: string) {
  return process.env[name] ? "set" : "missing"
}

async function slackHealth(): Promise<boolean> {
  // if token not present -> skip
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return false
  try {
    const res = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    })
    const j = await res.json()
    return Boolean(j?.ok)
  } catch {
    return false
  }
}

async function main() {
  const envStatus = {
    SLACK_BOT_TOKEN: presence("SLACK_BOT_TOKEN"),
    SLACK_CHANNEL_ID: presence("SLACK_CHANNEL_ID"),
    JIRA_BASE_URL: presence("JIRA_BASE_URL"),
    JIRA_EMAIL: presence("JIRA_EMAIL"),
    JIRA_API_TOKEN: presence("JIRA_API_TOKEN"),
    JIRA_PROJECT_KEY: presence("JIRA_PROJECT_KEY"),
    APP_ID: presence("APP_ID"),
    PRIVATE_KEY: process.env.PRIVATE_KEY ? "set" : "missing",
    PRIVATE_KEY_PATH: presence("PRIVATE_KEY_PATH"),
    GITHUB_OWNER: presence("GITHUB_OWNER"),
    GITHUB_REPO: presence("GITHUB_REPO")
  }
  console.log("[env] variables presence:", envStatus)

  const sOK = await slackHealth()
  console.log("[slack] health:", sOK ? "ok" : "fail")

  const jOK = await jiraHealth()
  console.log("[jira] health:", jOK ? "ok" : "fail")

  // Exit non-zero if any fail
  process.exit(sOK && jOK ? 0 : 2)
}

main().catch(e => { console.error("[health] fatal", e); process.exit(2) })

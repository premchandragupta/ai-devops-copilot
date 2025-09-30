// ESM, Node 22+
// Posts results to Slack, Jira (ADF description via jiraClient), and GitHub Checks.
// Safe to call even if some integrations are not configured.
//
// Env used:
//  - Slack: SLACK_BOT_TOKEN, SLACK_CHANNEL_ID
//  - Jira:  JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY, (optional) JIRA_ISSUE_TYPE, JIRA_LABELS
//  - GitHub Checks: APP_ID, PRIVATE_KEY/PRIVATE_KEY_PATH, GITHUB_OWNER, GITHUB_REPO
//  - Flags: NO_GITHUB_CHECKS=1 to skip, NO_SLACK=1 to skip, NO_JIRA=1 to skip

import process from "node:process"
import { createOrUpdateCheck } from "./githubClient.js"
import { postMessage } from "./slackClient.js"
import { createIssue } from "./jiraClient.js"

type PostArgs = {
  headSha: string
  result: {
    mode?: "full" | "diff"
    repoPath?: string
    baseSha?: string
    headSha?: string
    reportPath?: string
    stats?: { total: number; high: number }
    findings?: Array<{
      tool?: string
      severity?: string
      file?: string
      line?: number
      ruleId?: string
      title?: string
      message?: string
    }>
  }
  exitCode: number
}

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
function hasGitHubEnv() {
  return !!(
    process.env.APP_ID &&
    (process.env.PRIVATE_KEY || process.env.PRIVATE_KEY_PATH) &&
    process.env.GITHUB_OWNER &&
    process.env.GITHUB_REPO
  )
}

function fmtFindingLine(f: any, idx: number) {
  const sev = String(f?.severity || "").toUpperCase()
  const rule = f?.ruleId || f?.title || "rule"
  const file = f?.file || "?"
  const line = typeof f?.line === "number" ? `:${f.line}` : ""
  const title = f?.title || ""
  return `${idx + 1}. **${sev}** [${rule}] — ${title} — \`${file}${line}\``
}

function buildSummaryText(result: PostArgs["result"]) {
  const total = result?.stats?.total ?? 0
  const high = result?.stats?.high ?? 0
  const med = (result?.findings || []).filter((f) => String(f?.severity).toUpperCase() === "MEDIUM").length
  const low = (result?.findings || []).filter((f) => String(f?.severity).toUpperCase() === "LOW").length
  return { total, high, med, low }
}

function topFindingsText(result: PostArgs["result"], cap = 10) {
  const list = (result?.findings || []).slice(0, cap).map((f, i) => fmtFindingLine(f, i))
  return list.join("\n")
}

export async function postIntegrations({ headSha, result, exitCode }: PostArgs) {
  const { total, high, med, low } = buildSummaryText(result)
  const top = topFindingsText(result, 10)
  const conclusion = high > 0 ? "failure" : "success"
  const summary = `Static + LLM analysis (${result.mode || "diff"}) — total=${total}, HIGH=${high}, MED=${med}, LOW=${low}`
  const textBlock =
    `AI DevOps Runner finished:\n` +
    `- Findings: total=${total}, HIGH=${high}, MED=${med}, LOW=${low}\n` +
    `- Exit code: ${exitCode}\n` +
    (result?.reportPath ? `- Report: ${result.reportPath}\n` : "") +
    (top ? `- Top findings:\n${top}` : "- Top findings: (none)")

  // ---------- Slack ----------
  if (!process.env.NO_SLACK && hasSlackEnv()) {
    try {
      const channel = process.env.SLACK_CHANNEL_ID!
      const trimmed = textBlock.length > 3500 ? textBlock.slice(0, 3490) + "\n…(truncated)" : textBlock
      // NOTE: slackClient.postMessage(channel, text)
      await postMessage(channel, trimmed)
    } catch (e: any) {
      console.error("[post] slack error:", e?.message || String(e))
    }
  }

  // ---------- Jira ----------
  if (!process.env.NO_JIRA && hasJiraEnv()) {
    try {
      const highs = (result.findings || [])
        .filter((f) => String(f?.severity).toUpperCase() === "HIGH")
        .slice(0, 3) // at most 3 issues per run
      for (const f of highs) {
        const summaryLine = `[AI DevOps] ${f.ruleId || f.title || "High finding"} in ${f.file || "?"}${typeof f.line === "number" ? ":" + f.line : ""}`
        const desc =
          `Auto-created by AI DevOps Runner\n` +
          `Severity: ${String(f.severity || "").toUpperCase()}\n` +
          `Rule: ${f.ruleId || f.title || "unknown"}\n` +
          `File: ${f.file || "?"}${typeof f.line === "number" ? ":" + f.line : ""}\n` +
          (result?.reportPath ? `Report: ${result.reportPath}\n` : "") +
          `Mode: ${result?.mode || "diff"}\n` +
          `Total findings: ${total} (HIGH=${high})`
        await createIssue({ summary: summaryLine, descriptionText: desc })
      }
    } catch (e: any) {
      console.error("[post] jira createIssue error:", e?.message || String(e))
    }
  }

  // ---------- GitHub Check ----------
  if (!process.env.NO_GITHUB_CHECKS && hasGitHubEnv()) {
    try {
      const owner = process.env.GITHUB_OWNER!
      const repo = process.env.GITHUB_REPO!
      const text =
        (textBlock.length > 65000 ? textBlock.slice(0, 64980) + "\n…(truncated)" : textBlock) ||
        "AI DevOps Runner finished."
      await createOrUpdateCheck({
        owner,
        repo,
        headSha,
        name: "AI DevOps Runner",
        conclusion: conclusion as "success" | "failure",
        summary,
        text
      })
    } catch (e: any) {
      console.error("[post] github check error:", e?.message || String(e))
    }
  }
}

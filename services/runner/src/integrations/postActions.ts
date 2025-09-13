import { optionalEnv } from './env.js'
import { createOrUpdateCheck } from './githubClient.js'
import { jiraHealth, createIssue } from './jiraClient.js'
import { slackHealth, postMessage } from './slackClient.js'

type Finding = {
  severity: string
  file?: string
  line?: number | string
  ruleId?: string
  title?: string
  message?: string
}

type AnalyzeResult = {
  findings?: Finding[]
  comments?: { file: string; line?: number; body: string }[]
  [key: string]: any
}

function summarize(result: AnalyzeResult) {
  const counts: Record<string, number> = {}
  for (const f of result.findings ?? []) {
    const s = (f.severity || 'UNKNOWN').toUpperCase()
    counts[s] = (counts[s] ?? 0) + 1
  }
  const total = (result.findings ?? []).length
  const high = counts['HIGH'] ?? 0
  const med = counts['MEDIUM'] ?? 0
  const low = counts['LOW'] ?? 0
  return { total, high, med, low, counts }
}

function topFindingsMarkdown(result: AnalyzeResult, n = 10): string {
  const list = (result.findings ?? []).slice(0, n).map((f, i) => {
    const loc = f.file ? `${f.file}${f.line ? ':'+f.line : ''}` : '(no file)'
    const id = f.ruleId ? ` [${f.ruleId}]` : ''
    const title = f.title || f.message || 'Finding'
    return `${i+1}. **${(f.severity||'').toUpperCase()}**${id} — ${title} — \`${loc}\``
  })
  return list.join('\n')
}

export async function postIntegrations(opts: {
  headSha?: string,
  result: AnalyzeResult,
  exitCode: number
}) {
  const { result, exitCode } = opts
  const sum = summarize(result)
  const top10 = topFindingsMarkdown(result, 10) || '_No findings._'

  // --- Slack ---
  try {
    const slackEnabled = !!optionalEnv('SLACK_BOT_TOKEN') && !!optionalEnv('SLACK_CHANNEL_ID')
    if (slackEnabled) {
      const ok = await slackHealth()
      if (ok) {
        const text =
`AI DevOps Runner finished:
- Findings: total=${sum.total}, HIGH=${sum.high}, MED=${sum.med}, LOW=${sum.low}
- Exit code: ${exitCode}
- Top findings:
${top10}`
        await postMessage(process.env.SLACK_CHANNEL_ID!, text)
      }
    }
  } catch (e) {
    console.error('[post] slack error:', (e as any)?.message || String(e))
  }

  // --- Jira (create issues for HIGH) ---
  try {
    const jiraOk = await jiraHealth()
    if (jiraOk && (sum.high > 0)) {
      const highs = (result.findings ?? []).filter(f => (f.severity||'').toUpperCase() === 'HIGH').slice(0, 10)
      for (const f of highs) {
        const loc = f.file ? `${f.file}${f.line ? ':'+f.line : ''}` : '(no file)'
        const title = `[AI Runner] HIGH${f.ruleId? ' '+f.ruleId:''} at ${loc}`
        const description =
`Detected HIGH severity issue.

Rule: ${f.ruleId || 'n/a'}
Title: ${f.title || 'n/a'}
Location: ${loc}

Message:
${f.message || 'n/a'}

Please review the pipeline report for details.`
        try {
          await createIssue(title, description)
        } catch (ie) {
          console.error('[post] jira createIssue error:', (ie as any)?.message || String(ie))
        }
      }
    }
  } catch (e) {
    console.error('[post] jira error:', (e as any)?.message || String(e))
  }

  // --- GitHub Check ---
  try {
    const owner = optionalEnv('GITHUB_OWNER')
    const repo = optionalEnv('GITHUB_REPO')
    const headSha = opts.headSha || optionalEnv('GITHUB_SHA')
    if (owner && repo && headSha) {
      const conclusion = (sum.high ?? 0) > 0 ? 'failure' : 'success'
      const summary = `Static + LLM analysis. Findings: total=${sum.total}, HIGH=${sum.high}, MED=${sum.med}, LOW=${sum.low}`
      const text = top10
      await createOrUpdateCheck({
        owner, repo, headSha,
        name: 'AI DevOps Runner',
        status: 'completed',
        conclusion,
        summary,
        text
      } as any)
    }
  } catch (e) {
    console.error('[post] github check error:', (e as any)?.message || String(e))
  }
}

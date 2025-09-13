import { requireEnv } from './env.js'
import { withBackoff } from './backoff.js'

function authHeader(): string {
  const email = requireEnv('JIRA_EMAIL')
  const token = requireEnv('JIRA_API_TOKEN')
  const raw = Buffer.from(`${email}:${token}`).toString('base64')
  return `Basic ${raw}`
}

function baseUrl(): string {
  let base = requireEnv('JIRA_BASE_URL')
  if (base.endsWith('/')) base = base.slice(0, -1)
  return base
}

export async function jiraHealth(): Promise<boolean> {
  const url = baseUrl() + '/rest/api/3/myself'
  const res = await withBackoff(() => fetch(url, { headers: { 'Authorization': authHeader(), 'Accept': 'application/json' } }))
  return res.ok
}

export async function jiraHealthVerbose(): Promise<{ ok: boolean; status: number; text?: string }> {
  const url = baseUrl() + '/rest/api/3/myself'
  const res = await withBackoff(() => fetch(url, { headers: { 'Authorization': authHeader(), 'Accept': 'application/json' } }))
  const ok = res.ok
  let text: string | undefined = undefined
  try {
    const body = await res.text()
    text = body.slice(0, 300)
  } catch {}
  return { ok, status: res.status, text }
}

export interface JiraIssue {
  key: string
  id: string
}

export async function createIssue(summary: string, description: string): Promise<JiraIssue> {
  const projectKey = requireEnv('JIRA_PROJECT_KEY')
  const url = baseUrl() + '/rest/api/3/issue'
  const body = {
    fields: {
      project: { key: projectKey },
      summary,
      issuetype: { name: 'Task' },
      description,
    }
  }
  const res = await withBackoff(() => fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  }))
  if (!res.ok) throw new Error(`Jira createIssue failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as any
  return { key: data.key, id: data.id }
}

export async function deleteIssue(issueIdOrKey: string): Promise<void> {
  const url = baseUrl() + `/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}`
  const res = await withBackoff(() => fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': authHeader(),
      'Accept': 'application/json'
    }
  }))
  if (!res.ok) throw new Error(`Jira deleteIssue failed: ${res.status} ${await res.text()}`)
}

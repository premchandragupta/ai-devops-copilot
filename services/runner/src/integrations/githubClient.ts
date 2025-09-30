// Robust GitHub client using @octokit/auth-app (works across versions).
// - Preflights repo installation
// - Returns installation-scoped Octokit or null if app not installed
// - createOrUpdateCheck throws a friendly hint if not installed

import fs from 'node:fs'
import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { optionalEnv } from './env.js'

// Local helper if your env module doesn't export requireEnv
function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v || !v.trim()) throw new Error(`Missing required env: ${name}`)
  return v.trim()
}

function getAppConfig() {
  const appId = Number(requireEnv('APP_ID'))
  const keyPath = requireEnv('PRIVATE_KEY_PATH')
  const privateKey = fs.readFileSync(keyPath, 'utf8')
  return { appId, privateKey }
}

// Returns an installation-scoped Octokit for {owner, repo}, or null if app not installed on that repo
export async function getInstallationOctokit(owner: string, repo: string): Promise<Octokit | null> {
  const { appId, privateKey } = getAppConfig()

  // App-scoped Octokit (JWT) to discover installation
  const appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId, privateKey },
  })

  try {
    const { data } = await appOctokit.request('GET /repos/{owner}/{repo}/installation', { owner, repo })
    const installationId = data.id

    // Installation-scoped Octokit (uses installation token)
    const installationOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: { appId, privateKey, installationId },
    })

    return installationOctokit
  } catch (e: any) {
    if (e?.status === 404) return null // app not installed on this repo
    throw e
  }
}

type CheckParams = {
  owner: string
  repo: string
  headSha: string
  name: string
  status?: 'queued' | 'in_progress' | 'completed'
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'timed_out' | 'action_required' | null
  summary: string
  text?: string
}

export async function createOrUpdateCheck(params: CheckParams) {
  const { owner, repo } = params
  const octo = await getInstallationOctokit(owner, repo)
  if (!octo) {
    const hint = `GitHub App not installed on ${owner}/${repo}. Install it: GitHub → Settings → Developer settings → GitHub Apps → Your App → "Install App" → select ${owner}/${repo}.`
    throw new Error(hint)
  }
  const res = await octo.request('POST /repos/{owner}/{repo}/check-runs', {
    owner,
    repo,
    name: params.name,
    head_sha: params.headSha,
    status: params.status ?? 'completed',
    conclusion: params.conclusion ?? 'neutral',
    output: {
      title: params.name,
      summary: params.summary,
      text: params.text ?? '',
    },
  })
  return res.data
}

import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import { optionalEnv, requireEnv } from './env.js'
import { withBackoff } from './backoff.js'
import fs from 'node:fs'

export interface GitHubCheckInput {
  owner: string
  repo: string
  headSha: string
  name: string
  status?: 'queued' | 'in_progress' | 'completed'
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'timed_out' | 'action_required' | 'skipped'
  summary?: string
  text?: string
}

function loadPrivateKey(): string {
  const path = optionalEnv('PRIVATE_KEY_PATH')
  const inline = optionalEnv('PRIVATE_KEY')
  if (path && fs.existsSync(path)) {
    return fs.readFileSync(path, 'utf8')
  }
  if (inline) return inline.replace(/\r/g, '\n')
  throw new Error('Missing PRIVATE_KEY or PRIVATE_KEY_PATH')
}

export function createGitHubAppOctokit(): Octokit {
  const appId = requireEnv('APP_ID')
  const privateKey = loadPrivateKey()

  const appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId, privateKey },
  })
  return appOctokit
}

export async function getInstallationOctokit(owner: string, repo: string): Promise<Octokit> {
  const appOctokit = createGitHubAppOctokit()
  const { data } = await withBackoff(() => appOctokit.request('GET /repos/{owner}/{repo}/installation', { owner, repo }))
  const installationId = data.id

  const appId = requireEnv('APP_ID')
  const privateKey = loadPrivateKey()

  const installationOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId, privateKey, installationId },
  })
  return installationOctokit
}

export async function createOrUpdateCheck(input: GitHubCheckInput): Promise<void> {
  const client = await getInstallationOctokit(input.owner, input.repo)
  const status = input.status ?? 'completed'
  const conclusion = input.conclusion ?? 'success'

  await withBackoff(() => client.checks.create({
    owner: input.owner,
    repo: input.repo,
    name: input.name,
    head_sha: input.headSha,
    status,
    conclusion,
    output: {
      title: input.name,
      summary: input.summary ?? '',
      text: input.text ?? '',
    }
  }))
}

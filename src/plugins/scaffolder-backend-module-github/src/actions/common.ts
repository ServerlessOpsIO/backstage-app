import { Octokit } from 'octokit'

type RepoDetails = {
  host: string
  owner: string
  repo: string
}

const GITHUB_API_VERSION = '2026-03-10'

export function parseRepoUrl(repoUrl: string): RepoDetails {
  const [host, queryString] = repoUrl.split('?')
  const searchParams = new URLSearchParams(queryString)
  const owner = searchParams.get('owner')
  const repo = searchParams.get('repo')

  if (!host || !owner || !repo) {
    throw new Error(`Invalid repoUrl: ${repoUrl}`)
  }

  return { host, owner, repo }
}

export function createUserOctokit(
  secrets: Record<string, string> | undefined,
  userCredentialsSecretKey: string | undefined,
): Octokit {
  const secretKey = userCredentialsSecretKey ?? 'USER_GITHUB_TOKEN'
  const userGithubToken = secrets?.[secretKey]

  if (!userGithubToken || typeof userGithubToken !== 'string') {
    throw new Error(
      `Missing GitHub user token secret "${secretKey}". Configure requestUserCredentials in the template step to provide this secret.`,
    )
  }

  return new Octokit({
    auth: userGithubToken,
    request: {
      headers: {
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    },
  })
}

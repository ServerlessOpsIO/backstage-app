import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { createGithubPullRequestAction } from './pull-request'

const mockRequest = jest.fn()

jest.mock('octokit', () => ({
  Octokit: jest.fn(() => ({ request: mockRequest })),
}))

describe('github:pullRequest:create', () => {
  const action = createGithubPullRequestAction()
  const input = {
    repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
    head: 'copilot/photo-album',
    title: 'Spec and plan: Photo album',
    description: 'Created from Backstage.',
  }
  const prUrl = 'https://github.com/ServerlessOpsIO/example-repo/pull/7'

  const mockRoutes = (existing: unknown[]) =>
    mockRequest.mockImplementation(async (route: string) => {
      switch (route) {
        case 'GET /repos/{owner}/{repo}':
          return { data: { default_branch: 'trunk' } }
        case 'GET /repos/{owner}/{repo}/pulls':
          return { data: existing }
        case 'POST /repos/{owner}/{repo}/pulls':
          return { data: { html_url: prUrl, number: 7 } }
        default:
          throw new Error(`Unexpected request ${route}`)
      }
    })

  afterEach(() => {
    jest.clearAllMocks()
    mockRequest.mockReset()
  })

  test('opens a pull request into the default branch and outputs its URL', async () => {
    mockRoutes([])
    const ctx = createMockActionContext({
      input,
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

    await action.handler(ctx)

    expect(mockRequest).toHaveBeenCalledWith(
      'GET /repos/{owner}/{repo}/pulls',
      {
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        head: 'ServerlessOpsIO:copilot/photo-album',
        base: 'trunk',
        state: 'open',
      },
    )
    expect(mockRequest).toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/pulls',
      {
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        head: 'copilot/photo-album',
        base: 'trunk',
        title: input.title,
        body: input.description,
        draft: false,
      },
    )
    expect(ctx.output).toHaveBeenCalledWith('pullRequestUrl', prUrl)
    expect(ctx.output).toHaveBeenCalledWith('pullRequestNumber', 7)
  })

  test('returns an open pull request for the same branches instead of opening another', async () => {
    const existingUrl = 'https://github.com/ServerlessOpsIO/example-repo/pull/3'
    mockRoutes([{ html_url: existingUrl, number: 3 }])
    const ctx = createMockActionContext({
      input: { ...input, base: 'main' },
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

    await action.handler(ctx)

    expect(mockRequest).not.toHaveBeenCalledWith(
      'GET /repos/{owner}/{repo}',
      expect.anything(),
    )
    expect(mockRequest).not.toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/pulls',
      expect.anything(),
    )
    expect(ctx.output).toHaveBeenCalledWith('pullRequestUrl', existingUrl)
    expect(ctx.output).toHaveBeenCalledWith('pullRequestNumber', 3)

    mockRequest.mockRejectedValue(new Error('Validation Failed'))
    await expect(action.handler(ctx)).rejects.toThrow(
      'Failed to open a pull request from copilot/photo-album into main in ServerlessOpsIO/example-repo: Validation Failed',
    )
  })
})

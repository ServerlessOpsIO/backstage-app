import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { createGithubPullRequestCommentAction } from './pr-comment'

const mockRequest = jest.fn()

jest.mock('octokit', () => ({
  Octokit: jest.fn(() => ({ request: mockRequest })),
}))

describe('x_github:pr:comment', () => {
  const action = createGithubPullRequestCommentAction()
  const input = {
    repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
    pullRequestNumber: 7,
    body: '@copilot /speckit-clarify',
  }
  const commentUrl =
    'https://github.com/ServerlessOpsIO/example-repo/pull/7#issuecomment-42'

  afterEach(() => {
    jest.clearAllMocks()
    mockRequest.mockReset()
  })

  test('posts the comment on the pull request and outputs its URL and ID', async () => {
    mockRequest.mockResolvedValue({ data: { html_url: commentUrl, id: 42 } })
    const ctx = createMockActionContext({
      input,
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

    await action.handler(ctx)

    expect(mockRequest).toHaveBeenCalledTimes(1)
    expect(mockRequest).toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
      {
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        issue_number: 7,
        body: '@copilot /speckit-clarify',
      },
    )
    expect(ctx.output).toHaveBeenCalledWith('commentUrl', commentUrl)
    expect(ctx.output).toHaveBeenCalledWith('commentId', 42)
  })

  test('fails clearly for a missing token or a failed request', async () => {
    await expect(
      action.handler(createMockActionContext({ input, secrets: {} })),
    ).rejects.toThrow('Missing GitHub user token secret "USER_GITHUB_TOKEN"')
    expect(mockRequest).not.toHaveBeenCalled()

    mockRequest.mockRejectedValue(new Error('Not Found'))
    await expect(
      action.handler(
        createMockActionContext({
          input,
          secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
        }),
      ),
    ).rejects.toThrow(
      'Failed to comment on pull request 7 in ServerlessOpsIO/example-repo: Not Found',
    )
  })
})

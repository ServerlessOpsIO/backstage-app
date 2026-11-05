import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { createGithubIssueAction } from './issue-create'

const mockRequest = jest.fn()

jest.mock('octokit', () => ({
  Octokit: jest.fn(() => ({ request: mockRequest })),
}))

describe('x_github:issue:create', () => {
  const action = createGithubIssueAction()
  const input = {
    repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
    title: 'Add widget',
    body: 'As a user, I can widget\n\n##Proposed Solution\nDo it',
    labels: ['feature'],
  }
  const secrets = { USER_GITHUB_TOKEN: 'gh-user-token' }
  const issue = {
    html_url: 'https://github.com/ServerlessOpsIO/example-repo/issues/12',
    number: 12,
  }
  const contextFor = (taskId: string, overrides = {}) =>
    createMockActionContext({
      input,
      secrets,
      task: { id: taskId },
      ...overrides,
    })

  afterEach(() => {
    jest.clearAllMocks()
    mockRequest.mockReset()
  })

  test('creates the issue with title, labels and body, and outputs its URL and number', async () => {
    mockRequest.mockImplementation(async (route: string) =>
      route === 'GET /search/issues'
        ? { data: { items: [] } }
        : { data: issue },
    )
    const ctx = contextFor('task-1')

    await action.handler(ctx)

    expect(mockRequest).toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/issues',
      {
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        title: 'Add widget',
        labels: ['feature'],
        body: `${input.body}\n\n<!-- spec-key: task-1 -->`,
      },
    )
    expect(ctx.output).toHaveBeenCalledWith('issueUrl', issue.html_url)
    expect(ctx.output).toHaveBeenCalledWith('issueNumber', 12)
  })

  test('reuses the issue carrying the same run marker', async () => {
    mockRequest.mockResolvedValue({
      data: {
        items: [{ ...issue, body: `${input.body}\n\n<!-- spec-key: task-1 -->` }],
      },
    })
    const ctx = contextFor('task-1')

    await action.handler(ctx)

    expect(mockRequest).toHaveBeenCalledTimes(1)
    expect(ctx.output).toHaveBeenCalledWith('issueNumber', 12)
  })

  test('creates distinct issues with distinct markers for different runs', async () => {
    let next = 20
    mockRequest.mockImplementation(async (route: string) =>
      route === 'GET /search/issues'
        ? { data: { items: [] } }
        : { data: { html_url: 'u', number: next++ } },
    )

    await action.handler(contextFor('task-a'))
    await action.handler(contextFor('task-b'))

    const posts = mockRequest.mock.calls.filter(
      ([route]) => route === 'POST /repos/{owner}/{repo}/issues',
    )
    expect(posts).toHaveLength(2)
    expect(posts[0][1].body).toContain('<!-- spec-key: task-a -->')
    expect(posts[1][1].body).toContain('<!-- spec-key: task-b -->')
  })

  test('fails clearly for a missing token, unsupported host or failed request', async () => {
    await expect(
      action.handler(createMockActionContext({ input, secrets: {} })),
    ).rejects.toThrow('Missing GitHub user token secret "USER_GITHUB_TOKEN"')

    await expect(
      action.handler(
        createMockActionContext({
          input: { ...input, repoUrl: 'ghe.example.com?owner=o&repo=r' },
          secrets,
        }),
      ),
    ).rejects.toThrow('Unsupported repo host for creating an issue')
    expect(mockRequest).not.toHaveBeenCalled()

    mockRequest.mockRejectedValue(new Error('Not Found'))
    await expect(action.handler(contextFor('task-1'))).rejects.toThrow(
      'Failed to create issue in ServerlessOpsIO/example-repo: Not Found',
    )
  })

  test('never uses closing keywords or changes issue state', async () => {
    mockRequest.mockImplementation(async (route: string) =>
      route === 'GET /search/issues'
        ? { data: { items: [] } }
        : { data: issue },
    )

    await action.handler(contextFor('task-1'))

    const routes = mockRequest.mock.calls.map(([route]) => route)
    expect(routes.every(r => !/PATCH|PUT|DELETE/.test(r))).toBe(true)
    const [, payload] = mockRequest.mock.calls.find(
      ([route]) => route === 'POST /repos/{owner}/{repo}/issues',
    )!
    expect(payload).not.toHaveProperty('state')
    expect(payload.body).not.toMatch(/\b(close[sd]?|fix(es|ed)?|resolve[sd]?)\b/i)
  })
})

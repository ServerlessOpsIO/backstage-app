import { Octokit } from 'octokit'
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { createSpecKitConstitutionAction } from './speckit-constitution'

const mockRequest = jest.fn()

jest.mock('octokit', () => ({
  Octokit: jest.fn(() => ({ request: mockRequest })),
}))

describe('github:copilot:speckit:constitution', () => {
  const action = createSpecKitConstitutionAction()
  const input = {
    repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
    prompt: 'Create a constitution emphasizing testing',
  }
  const taskUrl =
    'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/12345'

  beforeEach(() => {
    mockRequest.mockResolvedValue({
      data: { id: 12345, html_url: taskUrl },
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    mockRequest.mockReset()
  })

  test('runs the /speckit.constitution skill by default and exposes task outputs', async () => {
    const ctx = createMockActionContext({
      input,
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

    await action.handler(ctx)

    expect(action.id).toBe('github:copilot:speckit:constitution')
    expect(action.schema?.input?.properties).not.toHaveProperty('customAgent')
    expect(action.schema?.input?.properties).toHaveProperty('integrationType')
    expect(action.schema?.input?.required).toEqual(['repoUrl', 'prompt'])
    expect(mockRequest).toHaveBeenCalledWith(
      'POST /agents/repos/{owner}/{repo}/tasks',
      {
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        prompt: `/speckit.constitution ${input.prompt}`,
        model: 'auto',
        create_pull_request: true,
      },
    )
    expect(ctx.output).toHaveBeenCalledWith('taskId', '12345')
    expect(ctx.output).toHaveBeenCalledWith('taskUrl', taskUrl)
  })

  test('forwards task options and credentials to the agent integration but does not allow an agent override', async () => {
    const ctx = createMockActionContext({
      input: {
        ...input,
        baseRef: 'develop',
        model: 'custom-model',
        createPullRequest: false,
        userCredentialsSecretKey: 'CUSTOM_GITHUB_TOKEN',
        integrationType: 'agent',
        customAgent: 'another-agent',
      },
      secrets: { CUSTOM_GITHUB_TOKEN: 'custom-user-token' },
    })

    await action.handler(ctx)

    expect(Octokit).toHaveBeenLastCalledWith({
      auth: 'custom-user-token',
      request: {
        headers: { 'X-GitHub-Api-Version': '2026-03-10' },
      },
    })
    expect(mockRequest).toHaveBeenCalledWith(
      'POST /agents/repos/{owner}/{repo}/tasks',
      {
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        prompt: input.prompt,
        base_ref: 'develop',
        model: 'custom-model',
        create_pull_request: false,
        agent: 'speckit.constitution',
      },
    )
  })

  test.each([
    [
      { ...input, prompt: ' ' },
      { USER_GITHUB_TOKEN: 'gh-user-token' },
      'A non-empty prompt is required',
    ],
    [
      { ...input, repoUrl: 'github.com?owner=ServerlessOpsIO' },
      { USER_GITHUB_TOKEN: 'gh-user-token' },
      'Invalid repoUrl',
    ],
    [
      {
        ...input,
        repoUrl: 'gitlab.com?owner=ServerlessOpsIO&repo=example-repo',
      },
      { USER_GITHUB_TOKEN: 'gh-user-token' },
      'Unsupported repo host',
    ],
    [input, {}, 'Missing GitHub user token secret'],
  ])(
    'rejects invalid inputs or missing credentials (%#)',
    async (taskInput, secrets, message) => {
      const ctx = createMockActionContext({ input: taskInput, secrets })

      await expect(action.handler(ctx)).rejects.toThrow(message)
      expect(mockRequest).not.toHaveBeenCalled()
      expect(ctx.output).not.toHaveBeenCalled()
    },
  )

  test('surfaces GitHub API failures without emitting success outputs', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Agent profile not found'))
    const ctx = createMockActionContext({
      input,
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

    await expect(action.handler(ctx)).rejects.toThrow(
      'Failed to launch Copilot agent task: Agent profile not found',
    )
    expect(ctx.output).not.toHaveBeenCalled()
  })
})

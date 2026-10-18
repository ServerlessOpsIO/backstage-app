import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { createSpecKitImplementAction } from './speckit-implement'

const mockRequest = jest.fn()

jest.mock('octokit', () => ({
  Octokit: jest.fn(() => ({ request: mockRequest })),
}))

describe('github:copilot:speckit:implement', () => {
  const action = createSpecKitImplementAction()
  const input = {
    repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
    prompt: 'Implement all tasks in the first phase',
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

  test('runs the /speckit.implement skill by default and exposes task outputs', async () => {
    const ctx = createMockActionContext({
      input,
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

    await action.handler(ctx)

    expect(action.id).toBe('github:copilot:speckit:implement')
    expect(action.schema?.input?.properties).not.toHaveProperty('customAgent')
    expect(action.schema?.input?.properties).toHaveProperty('integrationType')
    expect(action.schema?.input?.required).toEqual(['repoUrl', 'prompt'])
    expect(mockRequest).toHaveBeenCalledWith(
      'POST /agents/repos/{owner}/{repo}/tasks',
      {
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        prompt: `/speckit.implement ${input.prompt}`,
        create_pull_request: false,
      },
    )
    expect(ctx.output).toHaveBeenCalledWith('taskId', '12345')
    expect(ctx.output).toHaveBeenCalledWith('taskUrl', taskUrl)
  })

  test('launches the speckit.implement agent when integrationType is agent and does not allow an override', async () => {
    const ctx = createMockActionContext({
      input: {
        ...input,
        integrationType: 'agent',
        customAgent: 'another-agent',
      },
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

    await action.handler(ctx)

    expect(mockRequest).toHaveBeenCalledWith(
      'POST /agents/repos/{owner}/{repo}/tasks',
      expect.objectContaining({
        prompt: input.prompt,
        custom_agent: 'speckit.implement',
      }),
    )
  })

  test('rejects an unsupported integrationType', async () => {
    const ctx = createMockActionContext({
      input: { ...input, integrationType: 'plugin' },
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

    await expect(action.handler(ctx)).rejects.toThrow(
      'Unsupported integrationType: plugin',
    )
    expect(mockRequest).not.toHaveBeenCalled()
  })
})

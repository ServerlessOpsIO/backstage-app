import { Octokit } from 'octokit'

import { launchGithubCopilotAgentAction } from './launch'

jest.mock('octokit', () => ({
  Octokit: jest.fn(),
}))

describe('github:copilot:agent:launch', () => {
  const requestMock = jest.fn()

  beforeEach(() => {
    requestMock.mockResolvedValue({
      data: {
        id: 12345,
        html_url:
          'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/12345',
      },
    })
    ;(Octokit as unknown as jest.Mock).mockImplementation(() => ({
      request: requestMock,
    }))
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('launches a task with the custom agent chosen by the template', async () => {
    const action = launchGithubCopilotAgentAction()

    await action.handler({
      input: {
        repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
        prompt: 'Create starter implementation',
        customAgent: 'security-reviewer',
      },
      logger: { info: jest.fn() } as any,
      output: jest.fn(),
      secrets: {
        USER_GITHUB_TOKEN: 'gh-user-token',
      },
    } as any)

    expect(action.id).toBe('github:copilot:agent:launch')
    expect(action.schema?.input?.properties).toHaveProperty('customAgent')
    expect(action.schema?.input?.properties).not.toHaveProperty(
      'integrationType',
    )
    expect(requestMock).toHaveBeenCalledWith(
      'POST /agents/repos/{owner}/{repo}/tasks',
      expect.objectContaining({
        prompt: 'Create starter implementation',
        custom_agent: 'security-reviewer',
      }),
    )
  })
})

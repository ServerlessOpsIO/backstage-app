import { GithubCredentialsProvider } from '@backstage/integration'
import { Octokit } from 'octokit'

import { launchGithubCopilotAgentAction } from './launch'

jest.mock('octokit', () => ({
  Octokit: jest.fn(),
}))

describe('github:copilot:agent:launch', () => {
  let githubCredentialsProvider: jest.Mocked<GithubCredentialsProvider>
  let requestMock: jest.Mock

  beforeEach(() => {
    requestMock = jest.fn().mockResolvedValue({
      data: {
        id: 12345,
        html_url:
          'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/12345',
      },
    })
    ;(Octokit as unknown as jest.Mock).mockImplementation(() => ({
      request: requestMock,
    }))
    githubCredentialsProvider = {
      getCredentials: jest.fn().mockResolvedValue({
        token: 'gh-test-token',
        headers: {
          Authorization: 'token gh-test-token',
        },
        type: 'app',
      }),
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('launches a Copilot agent task', async () => {
    const action = launchGithubCopilotAgentAction(githubCredentialsProvider)
    const logger = { info: jest.fn() }
    const output = jest.fn()

    await action.handler({
        input: {
          repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
          prompt: 'Create starter implementation',
          baseRef: 'main',
          createPullRequest: true,
        },
        logger: logger as any,
        output,
      } as any)

    expect(githubCredentialsProvider.getCredentials).toHaveBeenCalledWith({
      url: 'https://github.com/ServerlessOpsIO/example-repo',
    })
    expect(Octokit).toHaveBeenCalledWith({
      auth: 'gh-test-token',
    })
    expect(requestMock).toHaveBeenCalledWith(
      'POST /agents/repos/{owner}/{repo}/tasks',
      expect.objectContaining({
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        prompt: 'Create starter implementation',
        base_ref: 'main',
        model: 'auto',
        create_pull_request: true,
        headers: {
          'X-GitHub-Api-Version': '2026-03-10',
        },
      }),
    )
    expect(output).toHaveBeenCalledWith('taskId', '12345')
    expect(output).toHaveBeenCalledWith(
      'taskUrl',
      'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/12345',
    )
  })

  test('throws for invalid repoUrl', async () => {
    const action = launchGithubCopilotAgentAction(githubCredentialsProvider)

    await expect(
      action.handler({
          input: {
            repoUrl: 'github.com?owner=ServerlessOpsIO',
            prompt: 'Create starter implementation',
          },
          logger: { info: jest.fn() } as any,
          output: jest.fn(),
        } as any),
    ).rejects.toThrow('Invalid repoUrl')
  })

  test('extracts task id from task_url when id is omitted', async () => {
    requestMock.mockResolvedValueOnce({
      data: {
        task_url:
          'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/77777',
      },
    })

    const action = launchGithubCopilotAgentAction(githubCredentialsProvider)
    const output = jest.fn()

    await action.handler({
      input: {
        repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
        prompt: 'Create starter implementation',
      },
      logger: { info: jest.fn() } as any,
      output,
    } as any)

    expect(output).toHaveBeenCalledWith('taskId', '77777')
    expect(output).toHaveBeenCalledWith(
      'taskUrl',
      'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/77777',
    )
  })

  test('reads task output fields from nested task payload', async () => {
    requestMock.mockResolvedValueOnce({
      data: {
        task: {
          id: 88888,
          html_url:
            'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/88888',
        },
      },
    })

    const action = launchGithubCopilotAgentAction(githubCredentialsProvider)
    const output = jest.fn()

    await action.handler({
      input: {
        repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
        prompt: 'Create starter implementation',
      },
      logger: { info: jest.fn() } as any,
      output,
    } as any)

    expect(output).toHaveBeenCalledWith('taskId', '88888')
    expect(output).toHaveBeenCalledWith(
      'taskUrl',
      'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/88888',
    )
  })
})

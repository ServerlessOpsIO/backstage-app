import { createMockDirectory } from '@backstage/backend-test-utils'
import { GithubCredentialsProvider } from '@backstage/integration'
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'
import mockFetch from 'jest-fetch-mock'

import { launchGithubCopilotAgentAction } from './launch'

describe('github:copilot:agent:launch', () => {
  let githubCredentialsProvider: jest.Mocked<GithubCredentialsProvider>

  beforeEach(() => {
    mockFetch.enableMocks()
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
    mockFetch.resetMocks()
    jest.resetAllMocks()
  })

  test('launches a Copilot agent task', async () => {
    const action = launchGithubCopilotAgentAction(githubCredentialsProvider)
    const logger = { info: jest.fn() }
    const output = jest.fn()
    const workspacePath = createMockDirectory().resolve('workspace')

    mockFetch.mockResponse(
      JSON.stringify({
        id: 12345,
        html_url: 'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/12345',
      }),
      { status: 201, statusText: 'Created' },
    )

    await action.handler(
      createMockActionContext({
        input: {
          repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
          prompt: 'Create starter implementation',
          baseRef: 'main',
          createPullRequest: true,
        },
        workspacePath,
        logger: logger as any,
        output,
        createTemporaryDirectory() {
          throw new Error('Not implemented')
        },
        checkpoint() {
          throw new Error('Not implemented')
        },
        getInitiatorCredentials() {
          throw new Error('Not implemented')
        },
      }),
    )

    expect(githubCredentialsProvider.getCredentials).toHaveBeenCalledWith({
      url: 'https://github.com/ServerlessOpsIO/example-repo',
    })
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/agents/repos/ServerlessOpsIO/example-repo/tasks',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'token gh-test-token',
          'X-GitHub-Api-Version': '2026-03-10',
        }),
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
    const workspacePath = createMockDirectory().resolve('workspace')

    await expect(
      action.handler(
        createMockActionContext({
          input: {
            repoUrl: 'github.com?owner=ServerlessOpsIO',
            prompt: 'Create starter implementation',
          },
          workspacePath,
          logger: { info: jest.fn() } as any,
          output: jest.fn(),
          createTemporaryDirectory() {
            throw new Error('Not implemented')
          },
          checkpoint() {
            throw new Error('Not implemented')
          },
          getInitiatorCredentials() {
            throw new Error('Not implemented')
          },
        }),
      ),
    ).rejects.toThrow('Invalid repoUrl')
  })
})


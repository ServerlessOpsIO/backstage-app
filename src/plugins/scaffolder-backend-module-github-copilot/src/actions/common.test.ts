import { setTimeout as sleepFor } from 'node:timers/promises'
import { Octokit } from 'octokit'

import { createGithubCopilotAgentAction } from './common'

jest.mock('octokit', () => ({
  Octokit: jest.fn(),
}))

// Resolve the polling delay immediately instead of waiting.
jest.mock('node:timers/promises', () => ({
  setTimeout: jest.fn(),
}))

const sleepForMock = sleepFor as unknown as jest.Mock

const createAction = () =>
  createGithubCopilotAgentAction({
    id: 'test:copilot:agent',
    description: 'Test Copilot agent action',
  })

describe('createGithubCopilotAgentAction', () => {
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
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('launches a Copilot agent task', async () => {
    const action = createAction()
    const logger = { info: jest.fn() }
    const output = jest.fn()

    await action.handler({
        input: {
          repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
          prompt: 'Create starter implementation',
          baseRef: 'main',
          customAgent: 'security-reviewer',
          createPullRequest: true,
        },
        logger: logger as any,
        output,
        secrets: {
          USER_GITHUB_TOKEN: 'gh-user-token',
        },
      } as any)

    expect(Octokit).toHaveBeenCalledWith({
      auth: 'gh-user-token',
      request: {
        headers: {
          'X-GitHub-Api-Version': '2026-03-10',
        },
      },
    })
    expect(requestMock).toHaveBeenCalledWith(
      'POST /agents/repos/{owner}/{repo}/tasks',
      expect.objectContaining({
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        prompt: 'Create starter implementation',
        base_ref: 'main',
        create_pull_request: true,
        custom_agent: 'security-reviewer',
      }),
    )
    expect(output).toHaveBeenCalledWith('taskId', '12345')
    expect(output).toHaveBeenCalledWith(
      'taskUrl',
      'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/12345',
    )
  })

  describe('waitForCompletion', () => {
    const taskPath = 'GET /agents/repos/{owner}/{repo}/tasks/{task_id}'
    const context = (waitForCompletion?: boolean) =>
      ({
        input: {
          repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
          prompt: 'Create starter implementation',
          waitForCompletion,
        },
        logger: { info: jest.fn() } as any,
        output: jest.fn(),
        secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
      }) as any

    beforeEach(() => {
      requestMock.mockResolvedValueOnce({
        data: {
          id: 12345,
          state: 'queued',
          html_url:
            'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/12345',
        },
      })
    })

    test('does not wait by default', async () => {
      const ctx = context()

      await createAction().handler(ctx)

      expect(requestMock).toHaveBeenCalledTimes(1)
      expect(sleepForMock).not.toHaveBeenCalled()
      expect(ctx.output).toHaveBeenCalledWith('taskState', 'queued')
      expect(ctx.output).not.toHaveBeenCalledWith('headRef', expect.anything())
    })

    test('polls while the task is queued or in progress and succeeds when it completes', async () => {
      requestMock
        .mockResolvedValueOnce({ data: { id: 12345, state: 'in_progress' } })
        .mockResolvedValueOnce({
          data: {
            id: 12345,
            state: 'completed',
            sessions: [
              { head_ref: 'copilot/first-attempt' },
              { head_ref: 'copilot/create-starter-implementation' },
            ],
          },
        })
      const ctx = context(true)

      await createAction().handler(ctx)

      expect(sleepForMock).toHaveBeenCalledTimes(2)
      expect(sleepForMock).toHaveBeenCalledWith(30_000, undefined, {
        signal: undefined,
      })
      expect(requestMock).toHaveBeenCalledTimes(3)
      expect(requestMock).toHaveBeenLastCalledWith(taskPath, {
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        task_id: '12345',
      })
      expect(ctx.output).toHaveBeenCalledWith('taskId', '12345')
      expect(ctx.output).toHaveBeenCalledWith('taskState', 'completed')
      expect(ctx.output).toHaveBeenCalledWith(
        'headRef',
        'copilot/create-starter-implementation',
      )
    })

    test.each([
      'failed',
      'idle',
      'waiting_for_user',
      'timed_out',
      'cancelled',
    ])('fails when the task finishes as %s', async state => {
      requestMock.mockResolvedValueOnce({ data: { id: 12345, state } })
      const ctx = context(true)

      await expect(createAction().handler(ctx)).rejects.toThrow(
        `Copilot agent task 12345 finished with state "${state}"`,
      )

      expect(ctx.output).toHaveBeenCalledWith('taskUrl', expect.any(String))
      expect(ctx.output).toHaveBeenCalledWith('taskState', state)
    })

    test('fails when the task status cannot be read', async () => {
      requestMock.mockRejectedValueOnce(new Error('Not Found'))
      const ctx = context(true)

      await expect(createAction().handler(ctx)).rejects.toThrow(
        'Failed to check Copilot agent task 12345 status: Not Found',
      )
    })

    test('stops waiting when the scaffolder step is aborted', async () => {
      const controller = new AbortController()
      controller.abort()
      sleepForMock.mockRejectedValueOnce(
        Object.assign(new Error('The operation was aborted'), {
          name: 'AbortError',
        }),
      )
      const ctx = { ...context(true), signal: controller.signal }

      await expect(createAction().handler(ctx)).rejects.toThrow(
        'Stopped waiting for the Copilot agent task: step was aborted',
      )
      expect(requestMock).toHaveBeenCalledTimes(1)
    })
  })

  test('throws for invalid repoUrl', async () => {
    const action = createAction()

    await expect(
      action.handler({
          input: {
            repoUrl: 'github.com?owner=ServerlessOpsIO',
            prompt: 'Create starter implementation',
          },
          logger: { info: jest.fn() } as any,
          output: jest.fn(),
          secrets: {
            USER_GITHUB_TOKEN: 'gh-user-token',
          },
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

    const action = createAction()
    const output = jest.fn()

    await action.handler({
      input: {
        repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
        prompt: 'Create starter implementation',
      },
      logger: { info: jest.fn() } as any,
      output,
      secrets: {
        USER_GITHUB_TOKEN: 'gh-user-token',
      },
    } as any)

    const requestInput = requestMock.mock.calls[0][1]
    expect(requestInput).not.toHaveProperty('model')
    expect(requestInput).not.toHaveProperty('base_ref')
    expect(requestInput).not.toHaveProperty('custom_agent')
    expect(output).toHaveBeenCalledWith('taskId', '77777')
    expect(output).toHaveBeenCalledWith(
      'taskUrl',
      'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/77777',
    )
  })

  test('outputs the head ref from a branch artifact in the launch response', async () => {
    requestMock.mockResolvedValueOnce({
      data: {
        id: 12345,
        artifacts: [
          { provider: 'github', type: 'pull', data: { id: 42 } },
          {
            provider: 'github',
            type: 'branch',
            data: { head_ref: 'copilot/starter', base_ref: 'main' },
          },
        ],
      },
    })
    const output = jest.fn()

    await createAction().handler({
      input: {
        repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
        prompt: 'Create starter implementation',
      },
      logger: { info: jest.fn() } as any,
      output,
      secrets: {
        USER_GITHUB_TOKEN: 'gh-user-token',
      },
    } as any)

    expect(output).toHaveBeenCalledWith('headRef', 'copilot/starter')
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

    const action = createAction()
    const output = jest.fn()

    await action.handler({
      input: {
        repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
        prompt: 'Create starter implementation',
      },
      logger: { info: jest.fn() } as any,
      output,
      secrets: {
        USER_GITHUB_TOKEN: 'gh-user-token',
      },
    } as any)

    expect(output).toHaveBeenCalledWith('taskId', '88888')
    expect(output).toHaveBeenCalledWith(
      'taskUrl',
      'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/88888',
    )
  })

  test('throws when user github token secret is missing', async () => {
    const action = createAction()

    await expect(
      action.handler({
        input: {
          repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
          prompt: 'Create starter implementation',
        },
        logger: { info: jest.fn() } as any,
        output: jest.fn(),
        secrets: {},
      } as any),
    ).rejects.toThrow('Missing GitHub user token secret')
  })
})

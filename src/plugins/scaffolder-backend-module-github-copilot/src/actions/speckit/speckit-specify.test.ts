import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { createSpecKitPlanAction } from './speckit-plan'
import { createSpecKitSpecifyAction } from './speckit-specify'
import { parseSpecDirectoryName } from './spec-directory'

const mockRequest = jest.fn()

jest.mock('octokit', () => ({
  Octokit: jest.fn(() => ({ request: mockRequest })),
}))

describe('github:copilot:speckit:specify', () => {
  const action = createSpecKitSpecifyAction()
  const input = {
    repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
    prompt: 'Build a photo album app that groups photos by date',
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

  test('runs the /speckit.specify skill by default and exposes task outputs', async () => {
    const ctx = createMockActionContext({
      input,
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

    await action.handler(ctx)

    expect(action.id).toBe('github:copilot:speckit:specify')
    expect(action.schema?.input?.properties).not.toHaveProperty('customAgent')
    expect(action.schema?.input?.properties).toHaveProperty('integrationType')
    expect(action.schema?.input?.required).toEqual(['repoUrl', 'prompt'])
    expect(mockRequest).toHaveBeenCalledWith(
      'POST /agents/repos/{owner}/{repo}/tasks',
      {
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        prompt: `/speckit.specify ${input.prompt}`,
        create_pull_request: false,
      },
    )
    expect(ctx.output).toHaveBeenCalledWith('taskId', '12345')
    expect(ctx.output).toHaveBeenCalledWith('taskUrl', taskUrl)
  })

  test('launches the speckit.specify agent when integrationType is agent and does not allow an override', async () => {
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
        custom_agent: 'speckit.specify',
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

  describe('spec directory outputs', () => {
    const completedTask = {
      data: {
        id: 12345,
        html_url: taskUrl,
        state: 'completed',
        artifacts: [
          {
            provider: 'github',
            type: 'branch',
            data: { head_ref: 'copilot/photo-album', base_ref: 'main' },
          },
        ],
      },
    }
    const mockRoutes = (files: Array<{ filename: string; status: string }>) =>
      mockRequest.mockImplementation(async (route: string) => {
        if (route === 'POST /agents/repos/{owner}/{repo}/tasks') {
          return completedTask
        }
        if (route === 'GET /repos/{owner}/{repo}') {
          return { data: { default_branch: 'trunk' } }
        }
        if (route === 'GET /repos/{owner}/{repo}/compare/{basehead}') {
          return { data: { files } }
        }
        throw new Error(`Unexpected request ${route}`)
      })

    test('outputs the spec directory the task added once it completes', async () => {
      mockRoutes([
        { filename: '.github/copilot-instructions.md', status: 'modified' },
        {
          filename: 'specs/20261012-143000-photo-album/spec.md',
          status: 'added',
        },
        {
          filename: 'specs/20261012-143000-photo-album/checklists/requirements.md',
          status: 'added',
        },
        { filename: 'specs/001-older-feature/spec.md', status: 'modified' },
      ])
      const ctx = createMockActionContext({
        input: { ...input, waitForCompletion: true },
        secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
      })

      await action.handler(ctx)

      expect(action.schema?.output?.properties).toHaveProperty('specDirectory')
      expect(
        createSpecKitPlanAction().schema?.output?.properties,
      ).not.toHaveProperty('specDirectory')
      expect(mockRequest).toHaveBeenCalledWith(
        'GET /repos/{owner}/{repo}/compare/{basehead}',
        {
          owner: 'ServerlessOpsIO',
          repo: 'example-repo',
          basehead: 'trunk...copilot/photo-album',
        },
      )
      expect(ctx.output).toHaveBeenCalledWith('headRef', 'copilot/photo-album')
      expect(ctx.output).toHaveBeenCalledWith(
        'specDirectory',
        'specs/20261012-143000-photo-album',
      )
      expect(ctx.output).toHaveBeenCalledWith('specId', '20261012-143000')
      expect(ctx.output).toHaveBeenCalledWith('specName', 'photo-album')

      expect(parseSpecDirectoryName('004-photo-album')).toEqual({
        specId: '004',
        specName: 'photo-album',
      })
      expect(parseSpecDirectoryName('photo-album')).toEqual({
        specName: 'photo-album',
      })
    })

    test('compares against baseRef and fails unless exactly one spec was added', async () => {
      mockRoutes([
        { filename: 'specs/001-photo-album/spec.md', status: 'added' },
        { filename: 'specs/002-photo-sharing/spec.md', status: 'added' },
      ])
      const ctx = createMockActionContext({
        input: { ...input, baseRef: 'develop', waitForCompletion: true },
        secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
      })

      await expect(action.handler(ctx)).rejects.toThrow(
        'Expected copilot/photo-album to add exactly one specs/<directory>/spec.md compared with develop, but found 2: 001-photo-album, 002-photo-sharing',
      )
      expect(mockRequest).not.toHaveBeenCalledWith(
        'GET /repos/{owner}/{repo}',
        expect.anything(),
      )

      mockRoutes([])
      await expect(action.handler(ctx)).rejects.toThrow('but found none')
    })

    test('does not look for a spec when not waiting for completion', async () => {
      mockRoutes([])
      const ctx = createMockActionContext({
        input,
        secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
      })

      await action.handler(ctx)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(ctx.output).not.toHaveBeenCalledWith(
        'specDirectory',
        expect.anything(),
      )
    })
  })
})

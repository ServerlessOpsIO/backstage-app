import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { renameGithubBranchAction } from './rename-branch'

const mockRequest = jest.fn()

jest.mock('octokit', () => ({
  Octokit: jest.fn(() => ({ request: mockRequest })),
}))

describe('github:branch:rename', () => {
  const action = renameGithubBranchAction()
  const input = {
    repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
    branch: 'copilot/photo-album',
    newName: 'spec/photo-album',
  }

  afterEach(() => {
    jest.clearAllMocks()
    mockRequest.mockReset()
  })

  test('renames the branch and outputs the new name', async () => {
    mockRequest.mockResolvedValue({ data: { name: 'spec/photo-album' } })
    const ctx = createMockActionContext({
      input,
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

    await action.handler(ctx)

    expect(mockRequest).toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/branches/{branch}/rename',
      {
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        branch: 'copilot/photo-album',
        new_name: 'spec/photo-album',
      },
    )
    expect(ctx.output).toHaveBeenCalledWith('branch', 'spec/photo-album')
  })

  test('skips renaming to the same name and fails clearly on errors', async () => {
    const sameName = createMockActionContext({
      input: { ...input, newName: input.branch },
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })
    await action.handler(sameName)
    expect(mockRequest).not.toHaveBeenCalled()
    expect(sameName.output).toHaveBeenCalledWith('branch', input.branch)

    await expect(
      action.handler(
        createMockActionContext({
          input: { ...input, newName: ' ' },
          secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
        }),
      ),
    ).rejects.toThrow('A non-empty newName is required')

    mockRequest.mockRejectedValue(new Error('Branch already exists'))
    await expect(
      action.handler(
        createMockActionContext({
          input,
          secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
        }),
      ),
    ).rejects.toThrow(
      'Failed to rename ServerlessOpsIO/example-repo@copilot/photo-album to spec/photo-album: Branch already exists',
    )
  })
})

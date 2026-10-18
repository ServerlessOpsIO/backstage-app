import { createMockDirectory } from '@backstage/backend-test-utils'
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { commitFilesToGithubBranchAction } from './commit-files'

const mockRequest = jest.fn()

jest.mock('octokit', () => ({
  Octokit: jest.fn(() => ({ request: mockRequest })),
}))

describe('x_github:commitFiles', () => {
  const action = commitFilesToGithubBranchAction()
  const workspace = createMockDirectory()
  const input = {
    repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
    branch: 'copilot/photo-album',
    commitMessage: 'Add Backstage catalog file for spec',
    sourcePath: './spec-catalog',
    targetPath: 'specs/20261012-143000-photo-album',
  }

  beforeEach(() => {
    workspace.setContent({
      'spec-catalog': {
        'catalog-info.yaml': 'kind: Resource\n',
        docs: { 'index.md': '# Photo album\n' },
      },
      'ignored.txt': 'not in sourcePath',
    })
    let blobCount = 0
    mockRequest.mockImplementation(async (route: string) => {
      switch (route) {
        case 'GET /repos/{owner}/{repo}/git/ref/{ref}':
          return { data: { object: { sha: 'parent-sha' } } }
        case 'GET /repos/{owner}/{repo}/git/commits/{commit_sha}':
          return { data: { tree: { sha: 'parent-tree-sha' } } }
        case 'POST /repos/{owner}/{repo}/git/blobs':
          blobCount += 1
          return { data: { sha: `blob-sha-${blobCount}` } }
        case 'POST /repos/{owner}/{repo}/git/trees':
          return { data: { sha: 'new-tree-sha' } }
        case 'POST /repos/{owner}/{repo}/git/commits':
          return { data: { sha: 'new-commit-sha' } }
        case 'PATCH /repos/{owner}/{repo}/git/refs/{ref}':
          return { data: {} }
        default:
          throw new Error(`Unexpected request ${route}`)
      }
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    mockRequest.mockReset()
  })

  test('commits the source files under targetPath and pushes when push is true', async () => {
    const ctx = createMockActionContext({
      input: { ...input, push: true },
      workspacePath: workspace.path,
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

    await action.handler(ctx)

    const blobContents = mockRequest.mock.calls
      .filter(([route]) => route === 'POST /repos/{owner}/{repo}/git/blobs')
      .map(([, body]) => Buffer.from(body.content, 'base64').toString())
    expect(blobContents.sort()).toEqual(['# Photo album\n', 'kind: Resource\n'])

    const treeCall = mockRequest.mock.calls.find(
      ([route]) => route === 'POST /repos/{owner}/{repo}/git/trees',
    )
    expect(treeCall?.[1].base_tree).toBe('parent-tree-sha')
    expect(
      treeCall?.[1].tree.map((entry: { path: string }) => entry.path).sort(),
    ).toEqual([
      'specs/20261012-143000-photo-album/catalog-info.yaml',
      'specs/20261012-143000-photo-album/docs/index.md',
    ])
    expect(treeCall?.[1].tree[0]).toMatchObject({
      mode: '100644',
      type: 'blob',
    })

    expect(mockRequest).toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/git/commits',
      {
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        message: input.commitMessage,
        tree: 'new-tree-sha',
        parents: ['parent-sha'],
      },
    )
    expect(mockRequest).toHaveBeenCalledWith(
      'PATCH /repos/{owner}/{repo}/git/refs/{ref}',
      {
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        ref: 'heads/copilot/photo-album',
        sha: 'new-commit-sha',
        force: false,
      },
    )
    expect(ctx.output).toHaveBeenCalledWith('commitSha', 'new-commit-sha')
  })

  test('creates the commit without moving the branch by default', async () => {
    const ctx = createMockActionContext({
      input,
      workspacePath: workspace.path,
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

    await action.handler(ctx)

    expect(mockRequest).toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/git/commits',
      expect.objectContaining({ parents: ['parent-sha'] }),
    )
    expect(mockRequest).not.toHaveBeenCalledWith(
      'PATCH /repos/{owner}/{repo}/git/refs/{ref}',
      expect.anything(),
    )
    expect(ctx.output).toHaveBeenCalledWith('commitSha', 'new-commit-sha')
  })

  test('fails clearly for empty sources, missing tokens, and GitHub errors', async () => {
    await expect(
      action.handler(
        createMockActionContext({
          input: { ...input, sourcePath: './missing' },
          workspacePath: workspace.path,
          secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
        }),
      ),
    ).rejects.toThrow()

    workspace.addContent({ empty: {} })
    await expect(
      action.handler(
        createMockActionContext({
          input: { ...input, sourcePath: './empty' },
          workspacePath: workspace.path,
          secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
        }),
      ),
    ).rejects.toThrow('No files to commit in ./empty')

    await expect(
      action.handler(
        createMockActionContext({
          input,
          workspacePath: workspace.path,
          secrets: {},
        }),
      ),
    ).rejects.toThrow('Missing GitHub user token secret "USER_GITHUB_TOKEN"')

    await expect(
      action.handler(
        createMockActionContext({
          input: { ...input, targetPath: '../outside' },
          workspacePath: workspace.path,
          secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
        }),
      ),
    ).rejects.toThrow('Refusing to commit outside the repository')
    expect(mockRequest).not.toHaveBeenCalled()

    mockRequest.mockRejectedValueOnce(new Error('Reference does not exist'))
    await expect(
      action.handler(
        createMockActionContext({
          input,
          workspacePath: workspace.path,
          secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
        }),
      ),
    ).rejects.toThrow(
      'Failed to commit files to ServerlessOpsIO/example-repo@copilot/photo-album: Reference does not exist',
    )
    expect(mockRequest).not.toHaveBeenCalledWith(
      'PATCH /repos/{owner}/{repo}/git/refs/{ref}',
      expect.anything(),
    )
  })
})

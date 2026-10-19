import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createMockDirectory } from '@backstage/backend-test-utils'
import { cloneRepo } from '@backstage/plugin-scaffolder-node'
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { cloneGithubRepoAction } from './clone'

jest.mock('@backstage/plugin-scaffolder-node', () => ({
  ...jest.requireActual('@backstage/plugin-scaffolder-node'),
  cloneRepo: jest.fn(),
}))

const cloneRepoMock = cloneRepo as jest.Mock

describe('x_github:clone', () => {
  const action = cloneGithubRepoAction()
  const workspace = createMockDirectory()
  const repoUrl = 'github.com?owner=ServerlessOpsIO&repo=example-repo'

  const git = (cwd: string, ...args: string[]) =>
    execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()

  const createContext = (
    input: Record<string, unknown> = {},
    secrets: Record<string, string> = { USER_GITHUB_TOKEN: 'gh-user-token' },
  ) =>
    createMockActionContext({
      input: { repoUrl, ...input } as any,
      workspacePath: workspace.path,
      secrets,
    })

  // Stands in for cloning: creates a repository with one commit on the
  // requested branch, or main.
  beforeEach(() => {
    workspace.setContent({})
    cloneRepoMock.mockImplementation(
      async ({ dir, ref }: { dir: string; ref?: string }) => {
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(`${dir}/README.md`, '# Example\n')
        git(dir, 'init', '--quiet', '--initial-branch', ref ?? 'main')
        git(dir, 'add', '--all')
        git(dir, '-c', 'user.name=x', '-c', 'user.email=x@x', 'commit', '--quiet', '-m', 'Initial commit')
      },
    )
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('clones the repository into the workspace with the user token and reports the checkout', async () => {
    const ctx = createContext()

    await action.handler(ctx)

    expect(cloneRepoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://github.com/ServerlessOpsIO/example-repo.git',
        dir: workspace.path,
        auth: { username: 'x-access-token', password: 'gh-user-token' },
        ref: undefined,
        depth: 1,
      }),
    )
    expect(ctx.output).toHaveBeenCalledWith('branch', 'main')
    expect(ctx.output).toHaveBeenCalledWith(
      'commitSha',
      git(workspace.path, 'rev-parse', 'HEAD'),
    )
  })

  test('clones a given branch and depth into a subdirectory', async () => {
    const ctx = createContext({
      branch: 'develop',
      depth: 50,
      targetPath: 'repo',
      userCredentialsSecretKey: 'OTHER_TOKEN',
    }, { OTHER_TOKEN: 'other-token' })

    await action.handler(ctx)

    expect(cloneRepoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dir: workspace.resolve('repo'),
        auth: { username: 'x-access-token', password: 'other-token' },
        ref: 'develop',
        depth: 50,
      }),
    )
    expect(ctx.output).toHaveBeenCalledWith('branch', 'develop')
  })

  test('fails clearly for a missing token, a path outside the workspace, or a failed clone', async () => {
    await expect(action.handler(createContext({}, {}))).rejects.toThrow(
      'Missing GitHub user token secret "USER_GITHUB_TOKEN"',
    )
    await expect(
      action.handler(createContext({ targetPath: '../outside' })),
    ).rejects.toThrow()
    expect(cloneRepoMock).not.toHaveBeenCalled()

    cloneRepoMock.mockRejectedValueOnce(new Error('HTTP Error: 404 Not Found'))
    await expect(action.handler(createContext())).rejects.toThrow(
      `Failed to clone ServerlessOpsIO/example-repo into ${workspace.path}: HTTP Error: 404 Not Found`,
    )
  })
})

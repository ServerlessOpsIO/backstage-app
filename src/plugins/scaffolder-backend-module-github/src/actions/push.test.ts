import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createMockDirectory } from '@backstage/backend-test-utils'
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { parseCommitObject, pushGitBranchAction, toIsoDate } from './push'

const mockRequest = jest.fn()

jest.mock('octokit', () => ({
  Octokit: jest.fn(() => ({ request: mockRequest })),
}))

const git = (
  cwd: string,
  args: string[],
  options: { input?: string | Buffer; env?: NodeJS.ProcessEnv } = {},
) =>
  execFileSync('git', args, {
    cwd,
    input: options.input,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
  }).trim()

const notFound = () => Object.assign(new Error('Not Found'), { status: 404 })

/**
 * Stands in for the GitHub API by creating each object and ref with git
 * plumbing in a bare repository, so object SHAs come out as git computes them.
 */
function fakeGithub(bare: string) {
  let index = 0
  return async (route: string, params: Record<string, any>) => {
    switch (route) {
      case 'GET /repos/{owner}/{repo}/git/ref/{ref}': {
        try {
          return {
            data: { object: { sha: git(bare, ['rev-parse', '--verify', `refs/${params.ref}`]) } },
          }
        } catch {
          throw notFound()
        }
      }
      case 'GET /repos/{owner}/{repo}/git/commits/{commit_sha}': {
        try {
          git(bare, ['cat-file', '-e', `${params.commit_sha}^{commit}`])
        } catch {
          throw notFound()
        }
        return {
          data: { tree: { sha: git(bare, ['rev-parse', `${params.commit_sha}^{tree}`]) } },
        }
      }
      case 'POST /repos/{owner}/{repo}/git/blobs':
        return {
          data: {
            sha: git(bare, ['hash-object', '-w', '--stdin'], {
              input: Buffer.from(params.content, 'base64'),
            }),
          },
        }
      case 'POST /repos/{owner}/{repo}/git/trees': {
        index += 1
        const env = { GIT_INDEX_FILE: `${bare}/index-${index}` }
        if (params.base_tree) {
          git(bare, ['read-tree', params.base_tree], { env })
        }
        const entries = params.tree
          .map((entry: { mode: string; path: string; sha: string | null }) =>
            entry.sha
              ? `${entry.mode} ${entry.sha}\t${entry.path}`
              : `0 ${'0'.repeat(40)}\t${entry.path}`,
          )
          .join('\n')
        git(bare, ['update-index', '--index-info'], { input: `${entries}\n`, env })
        return { data: { sha: git(bare, ['write-tree'], { env }) } }
      }
      case 'POST /repos/{owner}/{repo}/git/commits':
        return {
          data: {
            sha: git(
              bare,
              [
                'commit-tree',
                params.tree,
                ...params.parents.flatMap((parent: string) => ['-p', parent]),
                '-F',
                '-',
              ],
              {
                input: params.message,
                env: {
                  GIT_AUTHOR_NAME: params.author.name,
                  GIT_AUTHOR_EMAIL: params.author.email,
                  GIT_AUTHOR_DATE: params.author.date,
                  GIT_COMMITTER_NAME: params.committer.name,
                  GIT_COMMITTER_EMAIL: params.committer.email,
                  GIT_COMMITTER_DATE: params.committer.date,
                },
              },
            ),
          },
        }
      case 'POST /repos/{owner}/{repo}/git/refs':
        git(bare, ['update-ref', params.ref, params.sha])
        return { data: {} }
      case 'PATCH /repos/{owner}/{repo}/git/refs/{ref}': {
        const current = git(bare, ['rev-parse', `refs/${params.ref}`])
        try {
          git(bare, ['merge-base', '--is-ancestor', current, params.sha])
        } catch {
          throw Object.assign(new Error('Update is not a fast forward'), {
            status: 422,
          })
        }
        git(bare, ['update-ref', `refs/${params.ref}`, params.sha])
        return { data: {} }
      }
      default:
        throw new Error(`Unexpected request ${route}`)
    }
  }
}

describe('x_github:push', () => {
  const action = pushGitBranchAction()
  const root = createMockDirectory()
  const workspace = root.resolve('workspace')
  const remote = root.resolve('remote.git')
  const repoUrl = 'github.com?owner=ServerlessOpsIO&repo=example-repo'

  const commit = (message: string, date: string) => {
    git(workspace, ['add', '--all'])
    git(workspace, ['commit', '--quiet', '--message', message], {
      env: {
        GIT_AUTHOR_NAME: 'Tom Example',
        GIT_AUTHOR_EMAIL: 'tom@example.com',
        GIT_AUTHOR_DATE: date,
        GIT_COMMITTER_NAME: 'Backstage',
        GIT_COMMITTER_EMAIL: 'backstage@example.com',
        GIT_COMMITTER_DATE: date,
      },
    })
  }

  const createContext = (input: Record<string, unknown> = {}) =>
    createMockActionContext({
      input: { repoUrl, ...input } as any,
      workspacePath: workspace,
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

  // A clone of a repository with main on GitHub, then a spec branch with two
  // local commits that add, change, delete, and make files executable.
  beforeEach(() => {
    root.setContent({
      workspace: { 'README.md': '# Example\n', 'old.txt': 'remove me\n' },
    })
    git(root.path, ['init', '--quiet', '--bare', remote])
    git(workspace, ['init', '--quiet', '--initial-branch', 'main'])
    git(workspace, ['remote', 'add', 'origin', remote])
    git(workspace, ['add', '--all'])
    git(workspace, ['-c', 'user.name=Setup', '-c', 'user.email=setup@example.com', 'commit', '--quiet', '-m', 'Initial commit'])
    git(workspace, ['push', '--quiet', 'origin', 'main'])
    git(workspace, ['checkout', '--quiet', '-b', 'spec/photo-album'])

    root.addContent({
      'workspace/specs/20261018-101500-photo-album/spec.md': '# Photo album\n',
      'workspace/README.md': '# Example, updated\n',
    })
    commit('Add spec\n\nWith a body.', '2026-10-18T10:15:00-04:00')
    fs.rmSync(root.resolve('workspace/old.txt'))
    root.addContent({ 'workspace/scripts/run.sh': '#!/bin/sh\necho hi\n' })
    fs.chmodSync(root.resolve('workspace/scripts/run.sh'), 0o755)
    commit('Add plan', '2026-10-18T14:30:00+05:30')

    mockRequest.mockImplementation(fakeGithub(remote))
  })

  afterEach(() => {
    jest.clearAllMocks()
    mockRequest.mockReset()
  })

  test('recreates the local commits on GitHub with the same SHAs and creates the branch', async () => {
    const head = git(workspace, ['rev-parse', 'HEAD'])
    const ctx = createContext()
    const warn = jest.spyOn(ctx.logger, 'warn')

    await action.handler(ctx)

    expect(git(remote, ['rev-parse', 'refs/heads/spec/photo-album'])).toBe(head)
    expect(git(remote, ['rev-list', '--count', 'main..spec/photo-album'])).toBe('2')
    expect(() => git(remote, ['fsck', '--strict'])).not.toThrow()
    expect(ctx.output).toHaveBeenCalledWith('branch', 'spec/photo-album')
    expect(ctx.output).toHaveBeenCalledWith('commitSha', head)
    expect(mockRequest).toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/git/refs',
      expect.objectContaining({ ref: 'refs/heads/spec/photo-album', sha: head }),
    )
    expect(warn).not.toHaveBeenCalled()
  })

  test('fast-forwards an existing branch, and does nothing when it is up to date', async () => {
    git(workspace, ['push', '--quiet', 'origin', 'HEAD~1:refs/heads/spec/photo-album'])
    // The clone has no remote-tracking ref for it, so only GitHub's branch
    // shows that the first commit is already there.
    git(workspace, ['update-ref', '-d', 'refs/remotes/origin/spec/photo-album'])
    const head = git(workspace, ['rev-parse', 'HEAD'])

    await action.handler(createContext())
    expect(git(remote, ['rev-parse', 'refs/heads/spec/photo-album'])).toBe(head)
    expect(mockRequest).toHaveBeenCalledWith(
      'PATCH /repos/{owner}/{repo}/git/refs/{ref}',
      expect.objectContaining({ ref: 'heads/spec/photo-album', sha: head, force: false }),
    )

    mockRequest.mockClear()
    const ctx = createContext({ branch: 'spec/photo-album' })
    await action.handler(ctx)
    expect(mockRequest).toHaveBeenCalledTimes(1)
    expect(ctx.output).toHaveBeenCalledWith('commitSha', head)
  })

  test('fails without overwriting a branch that has commits the workspace lacks', async () => {
    const other = git(remote, ['commit-tree', `${git(remote, ['rev-parse', 'main^{tree}'])}`, '-p', 'main', '-m', 'Someone else'], {
      env: { GIT_AUTHOR_NAME: 'x', GIT_AUTHOR_EMAIL: 'x@x', GIT_COMMITTER_NAME: 'x', GIT_COMMITTER_EMAIL: 'x@x' },
    })
    git(remote, ['update-ref', 'refs/heads/spec/photo-album', other])

    await expect(action.handler(createContext())).rejects.toThrow(
      'Failed to push spec/photo-album to ServerlessOpsIO/example-repo: Update is not a fast forward',
    )
    expect(git(remote, ['rev-parse', 'refs/heads/spec/photo-album'])).toBe(other)
  })

  test('reads commit objects and converts their dates', () => {
    const epoch = (iso: string) => Date.parse(iso) / 1000
    expect(toIsoDate(epoch('2026-10-18T14:15:00Z'), '-0400')).toBe(
      '2026-10-18T10:15:00-04:00',
    )
    expect(toIsoDate(epoch('2026-10-18T09:00:00Z'), '+0530')).toBe(
      '2026-10-18T14:30:00+05:30',
    )

    const parsed = parseCommitObject(
      'abc',
      [
        'tree 1111',
        'parent 2222',
        'parent 3333',
        `author Tom Example <tom@example.com> ${epoch('2026-10-18T14:15:00Z')} -0400`,
        'committer Backstage <backstage@example.com> 1760796900 -0400',
        'gpgsig -----BEGIN PGP SIGNATURE-----',
        ' abc',
        ' -----END PGP SIGNATURE-----',
        '',
        'Subject',
        '',
        'Body line',
        '',
      ].join('\n'),
    )
    expect(parsed).toMatchObject({
      tree: '1111',
      parents: ['2222', '3333'],
      signed: true,
      message: 'Subject\n\nBody line\n',
      author: {
        name: 'Tom Example',
        email: 'tom@example.com',
        date: '2026-10-18T10:15:00-04:00',
      },
    })
  })
})

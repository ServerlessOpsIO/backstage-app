import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createMockDirectory } from '@backstage/backend-test-utils'
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { commitGitChangesAction } from './commit'

describe('x_github:commit', () => {
  const action = commitGitChangesAction()
  const workspace = createMockDirectory()

  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: workspace.path, encoding: 'utf8' }).trim()

  const createContext = (input: Record<string, unknown> = {}) =>
    createMockActionContext({
      input: {
        commitMessage: 'Add spec and plan',
        gitAuthorName: 'Tom Example',
        gitAuthorEmail: 'tom@example.com',
        ...input,
      } as any,
      workspacePath: workspace.path,
    })

  // A repository with one commit and a spec branch checked out.
  beforeEach(() => {
    workspace.setContent({ 'README.md': '# Example\n', 'old.txt': 'remove\n' })
    git('init', '--quiet', '--initial-branch', 'main')
    git('add', '--all')
    git('-c', 'user.name=Setup', '-c', 'user.email=setup@example.com', 'commit', '--quiet', '-m', 'Initial commit')
    git('checkout', '--quiet', '-b', 'spec/photo-album')
  })

  test('commits new, changed, and deleted files as the given author', async () => {
    workspace.addContent({
      'specs/20261018-101500-photo-album/spec.md': '# Photo album\n',
      'specs/20261018-101500-photo-album/catalog-info.yaml': 'kind: Resource\n',
      'README.md': '# Example, updated\n',
    })
    fs.rmSync(workspace.resolve('old.txt'))
    const ctx = createContext()

    await action.handler(ctx)

    const head = git('rev-parse', 'HEAD')
    expect(ctx.output).toHaveBeenCalledWith('commitSha', head)
    expect(ctx.output).toHaveBeenCalledWith('committed', true)
    expect(git('log', '-1', '--format=%an <%ae>|%s')).toBe(
      'Tom Example <tom@example.com>|Add spec and plan',
    )
    expect(git('show', '--name-status', '--format=', 'HEAD').split('\n').sort()).toEqual([
      'A\tspecs/20261018-101500-photo-album/catalog-info.yaml',
      'A\tspecs/20261018-101500-photo-album/spec.md',
      'D\told.txt',
      'M\tREADME.md',
    ])
    expect(git('rev-parse', '--abbrev-ref', 'HEAD')).toBe('spec/photo-album')
    expect(git('status', '--porcelain')).toBe('')
  })

  test('makes no commit when nothing changed, and fails outside a git repository', async () => {
    const head = git('rev-parse', 'HEAD')
    const ctx = createContext()

    await action.handler(ctx)

    expect(git('rev-parse', 'HEAD')).toBe(head)
    expect(ctx.output).toHaveBeenCalledWith('commitSha', head)
    expect(ctx.output).toHaveBeenCalledWith('committed', false)

    fs.rmSync(workspace.resolve('.git'), { recursive: true })
    await expect(action.handler(createContext())).rejects.toThrow(
      `Failed to commit changes in ${workspace.path}`,
    )
  })
})

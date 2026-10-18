import { execFile } from 'node:child_process'
import { createTemplateAction } from '@backstage/plugin-scaffolder-node'
import { Octokit } from 'octokit'

import { createUserOctokit, parseRepoUrl } from './common'

type GitError = Error & { stderr?: string }

// Commits can include large files; the default exec buffer is 1 MiB.
const MAX_GIT_OUTPUT_BYTES = 512 * 1024 * 1024

/** Runs git in the workspace and returns its raw stdout. */
function runGit(args: string[], cwd: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      args,
      { cwd, encoding: 'buffer', maxBuffer: MAX_GIT_OUTPUT_BYTES },
      (error, stdout, stderr) => {
        if (error) {
          reject(Object.assign(error, { stderr: stderr?.toString() ?? '' }))
          return
        }
        resolve(stdout)
      },
    )
  })
}

type Signature = { name: string; email: string; date: string }

type LocalCommit = {
  sha: string
  tree: string
  parents: string[]
  author: Signature
  committer: Signature
  message: string
  signed: boolean
}

type TreeChange = {
  path: string
  mode: string
  sha: string | null
}

/** Converts git's `<epoch> <+hhmm>` timestamp to ISO 8601 with its offset. */
export function toIsoDate(epochSeconds: number, offset: string): string {
  const sign = offset.startsWith('-') ? -1 : 1
  const offsetMinutes =
    sign *
    (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(3, 5)))
  const local = new Date((epochSeconds + offsetMinutes * 60) * 1000)
  return `${local.toISOString().slice(0, 19)}${offset.slice(0, 3)}:${offset.slice(3, 5)}`
}

function parseSignature(value: string): Signature {
  const match = value.match(/^(.*) <(.*)> (\d+) ([+-]\d{4})$/)
  if (!match) {
    throw new Error(`Unrecognized commit signature: ${value}`)
  }
  return {
    name: match[1],
    email: match[2],
    date: toIsoDate(Number(match[3]), match[4]),
  }
}

/** Parses the raw commit object that `git cat-file commit` prints. */
export function parseCommitObject(sha: string, raw: string): LocalCommit {
  const separator = raw.indexOf('\n\n')
  const headerText = separator === -1 ? raw : raw.slice(0, separator)
  const message = separator === -1 ? '' : raw.slice(separator + 2)
  const commit: LocalCommit = {
    sha,
    tree: '',
    parents: [],
    message,
    signed: false,
    author: { name: '', email: '', date: '' },
    committer: { name: '', email: '', date: '' },
  }
  for (const line of headerText.split('\n')) {
    const space = line.indexOf(' ')
    const key = line.slice(0, space)
    const value = line.slice(space + 1)
    if (key === 'tree') {
      commit.tree = value
    } else if (key === 'parent') {
      commit.parents.push(value)
    } else if (key === 'author') {
      commit.author = parseSignature(value)
    } else if (key === 'committer') {
      commit.committer = parseSignature(value)
    } else if (key === 'gpgsig' || key === 'gpgsig-sha256') {
      commit.signed = true
    }
  }
  return commit
}

/**
 * Parses `git diff-tree -r -z --no-renames` or `git ls-tree -r -z` output into
 * tree entries to create or delete.
 */
export function parseTreeChanges(output: string, listing: boolean): TreeChange[] {
  const fields = output.split('\0').filter(Boolean)
  const changes: TreeChange[] = []
  if (listing) {
    // <mode> <type> <sha>\t<path>
    for (const field of fields) {
      const [meta, path] = field.split('\t')
      const [mode, , sha] = meta.split(' ')
      changes.push({ path, mode, sha })
    }
    return changes
  }
  // :<old mode> <new mode> <old sha> <new sha> <status>, then the path
  for (let index = 0; index < fields.length; index += 2) {
    const [, newMode, , newSha, status] = fields[index].slice(1).split(' ')
    const path = fields[index + 1]
    changes.push(
      status === 'D'
        ? { path, mode: '100644', sha: null }
        : { path, mode: newMode, sha: newSha },
    )
  }
  return changes
}

async function remoteBranchSha(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
): Promise<string | undefined> {
  try {
    const { data } = await octokit.request(
      'GET /repos/{owner}/{repo}/git/ref/{ref}',
      { owner, repo, ref: `heads/${branch}` },
    )
    return data.object.sha
  } catch (error: unknown) {
    if ((error as { status?: number }).status === 404) {
      return undefined
    }
    throw error
  }
}

async function remoteCommitExists(
  octokit: Octokit,
  owner: string,
  repo: string,
  sha: string,
): Promise<boolean> {
  try {
    await octokit.request(
      'GET /repos/{owner}/{repo}/git/commits/{commit_sha}',
      { owner, repo, commit_sha: sha },
    )
    return true
  } catch (error: unknown) {
    if ((error as { status?: number }).status === 404) {
      return false
    }
    throw error
  }
}

export function pushGitBranchAction() {
  return createTemplateAction({
    id: 'x_github:push',
    description:
      'Pushes the commits of a branch in the workspace git repository to GitHub through the GitHub API',
    schema: {
      input: {
        repoUrl: z =>
          z.string({
            description: 'GitHub repository URL in Backstage repoUrl format',
          }),
        branch: z =>
          z
            .string({
              description:
                'Branch to push to on GitHub. Defaults to the branch checked out in the workspace.',
            })
            .optional(),
        userCredentialsSecretKey: z =>
          z
            .string({
              description:
                'Secret key containing the GitHub user token from requestUserCredentials',
            })
            .optional(),
      },
      output: {
        branch: z =>
          z.string({
            description: 'Branch that was pushed',
          }),
        commitSha: z =>
          z.string({
            description: 'SHA of the commit at the tip of the branch on GitHub',
          }),
      },
    },
    async handler(ctx) {
      const { host, owner, repo } = parseRepoUrl(ctx.input.repoUrl)
      if (host !== 'github.com') {
        throw new Error(`Unsupported repo host for pushing: ${host}`)
      }
      const octokit = createUserOctokit(
        ctx.secrets,
        ctx.input.userCredentialsSecretKey,
      )
      const git = async (...args: string[]) =>
        (await runGit(args, ctx.workspacePath)).toString('utf8')

      let branch = ctx.input.branch
      try {
        branch ??= (await git('rev-parse', '--abbrev-ref', 'HEAD')).trim()
        if (branch === 'HEAD') {
          throw new Error(
            'The workspace has no branch checked out. Set the branch input.',
          )
        }

        const head = (await git('rev-parse', 'HEAD')).trim()
        const remoteSha = await remoteBranchSha(octokit, owner, repo, branch)
        if (remoteSha === head) {
          ctx.logger.info(`${owner}/${repo}@${branch} is already at ${head}`)
          ctx.output('branch', branch)
          ctx.output('commitSha', head)
          return
        }

        // GitHub's branch tip counts as already pushed, but only if the
        // workspace has it; otherwise the push below fails as not a fast
        // forward.
        const knownRemoteSha =
          remoteSha &&
          (await git('cat-file', '-t', remoteSha).then(
            type => type.trim() === 'commit',
            () => false,
          ))
            ? remoteSha
            : undefined

        // Commits GitHub doesn't have yet, oldest first. Remote-tracking
        // branches from the clone mark what GitHub already has.
        const pending = (
          await git(
            'rev-list',
            '--reverse',
            '--topo-order',
            'HEAD',
            '--not',
            '--remotes',
            ...(knownRemoteSha ? [knownRemoteSha] : []),
          )
        )
          .split('\n')
          .filter(Boolean)

        // Local commit SHA to the SHA of the same commit on GitHub. They match
        // unless GitHub can't reproduce a commit exactly, such as a signed one.
        const pushed = new Map<string, string>()
        const remoteParent = async (parent: string) => {
          const mapped = pushed.get(parent)
          if (mapped) {
            return mapped
          }
          if (!(await remoteCommitExists(octokit, owner, repo, parent))) {
            throw new Error(
              `Commit ${parent} is not on GitHub. Fetch the branch's history into the workspace before pushing.`,
            )
          }
          return parent
        }

        for (const sha of pending) {
          const commit = parseCommitObject(sha, await git('cat-file', 'commit', sha))
          const parents = await Promise.all(commit.parents.map(remoteParent))

          const changes = commit.parents.length
            ? parseTreeChanges(
                await git(
                  'diff-tree',
                  '-r',
                  '-z',
                  '--no-renames',
                  '--no-commit-id',
                  commit.parents[0],
                  sha,
                ),
                false,
              )
            : parseTreeChanges(await git('ls-tree', '-r', '-z', sha), true)

          const tree = await Promise.all(
            changes.map(async change => {
              const type = change.mode === '160000' ? 'commit' : 'blob'
              if (change.sha && type === 'blob') {
                const content = await runGit(
                  ['cat-file', 'blob', change.sha],
                  ctx.workspacePath,
                )
                await octokit.request('POST /repos/{owner}/{repo}/git/blobs', {
                  owner,
                  repo,
                  content: content.toString('base64'),
                  encoding: 'base64',
                })
              }
              return {
                path: change.path,
                mode: change.mode as '100644' | '100755' | '040000' | '160000' | '120000',
                type: type as 'blob' | 'commit',
                sha: change.sha,
              }
            }),
          )

          let treeSha = commit.tree
          if (tree.length || !commit.parents.length) {
            const baseTree = commit.parents.length
              ? (
                  await octokit.request(
                    'GET /repos/{owner}/{repo}/git/commits/{commit_sha}',
                    { owner, repo, commit_sha: parents[0] },
                  )
                ).data.tree.sha
              : undefined
            const { data: newTree } = await octokit.request(
              'POST /repos/{owner}/{repo}/git/trees',
              {
                owner,
                repo,
                tree,
                ...(baseTree ? { base_tree: baseTree } : {}),
              },
            )
            treeSha = newTree.sha
          }

          const { data: created } = await octokit.request(
            'POST /repos/{owner}/{repo}/git/commits',
            {
              owner,
              repo,
              message: commit.message,
              tree: treeSha,
              parents,
              author: commit.author,
              committer: commit.committer,
            },
          )
          pushed.set(sha, created.sha)
          if (created.sha !== sha) {
            ctx.logger.warn(
              `Commit ${sha} was recreated on GitHub as ${created.sha}${
                commit.signed ? ' without its signature' : ''
              }`,
            )
          }
        }

        const tip = pushed.get(head) ?? (await remoteParent(head))
        if (remoteSha) {
          // Not forced, so this fails rather than overwriting commits that
          // aren't in the workspace.
          await octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
            owner,
            repo,
            ref: `heads/${branch}`,
            sha: tip,
            force: false,
          })
        } else {
          await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
            owner,
            repo,
            ref: `refs/heads/${branch}`,
            sha: tip,
          })
        }

        ctx.output('branch', branch)
        ctx.output('commitSha', tip)
        ctx.logger.info(
          `Pushed ${pending.length} commit(s) to ${owner}/${repo}@${branch} (${tip})`,
        )
      } catch (error: unknown) {
        const { message, stderr } = error as GitError
        const details = stderr?.trim()
          ? `${message}; stderr: ${stderr.trim()}`
          : message
        throw new Error(
          `Failed to push ${branch ?? 'the workspace branch'} to ${owner}/${repo}: ${details}`,
          { cause: error },
        )
      }
    },
  })
}

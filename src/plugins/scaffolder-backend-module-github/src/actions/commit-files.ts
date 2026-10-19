import { resolveSafeChildPath } from '@backstage/backend-plugin-api'
import { createTemplateAction } from '@backstage/plugin-scaffolder-node'
import fs from 'node:fs/promises'
import path from 'node:path'

import { createUserOctokit, parseRepoUrl } from './common'

type WorkspaceFile = {
  path: string
  content: string
  executable: boolean
}

async function readWorkspaceFiles(root: string): Promise<WorkspaceFile[]> {
  const files: WorkspaceFile[] = []
  const walk = async (dir: string) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile()) {
        const [content, stat] = await Promise.all([
          fs.readFile(fullPath),
          fs.stat(fullPath),
        ])
        files.push({
          path: path.relative(root, fullPath).split(path.sep).join('/'),
          content: content.toString('base64'),
          // eslint-disable-next-line no-bitwise
          executable: (stat.mode & 0o111) !== 0,
        })
      }
    }
  }
  await walk(root)
  return files
}

function toRepoPath(targetPath: string | undefined, filePath: string): string {
  const prefix = (targetPath ?? '').replace(/^\/+|\/+$/g, '')
  const joined = prefix ? path.posix.join(prefix, filePath) : filePath
  if (path.posix.normalize(joined).startsWith('..')) {
    throw new Error(`Refusing to commit outside the repository: ${joined}`)
  }
  return path.posix.normalize(joined)
}

export function commitFilesToGithubBranchAction() {
  return createTemplateAction({
    id: 'x_github:commitFiles',
    description:
      'Commits files from the workspace on top of an existing branch of a GitHub repository, and optionally pushes the commit to the branch',
    schema: {
      input: {
        repoUrl: z =>
          z.string({
            description: 'GitHub repository URL in Backstage repoUrl format',
          }),
        branch: z =>
          z.string({
            description: 'Existing branch the commit is based on',
          }),
        commitMessage: z =>
          z.string({
            description: 'Message for the commit',
          }),
        sourcePath: z =>
          z
            .string({
              description:
                'Workspace directory whose files are committed. Defaults to the workspace root.',
            })
            .optional(),
        targetPath: z =>
          z
            .string({
              description:
                'Repository directory the files are committed to. Defaults to the repository root.',
            })
            .optional(),
        push: z =>
          z
            .boolean({
              description:
                'If true, move the branch to the new commit. Defaults to false, which creates the commit without adding it to the branch.',
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
        commitSha: z =>
          z.string({
            description: 'SHA of the new commit',
          }),
      },
    },
    async handler(ctx) {
      const { host, owner, repo } = parseRepoUrl(ctx.input.repoUrl)
      if (host !== 'github.com') {
        throw new Error(`Unsupported repo host for committing files: ${host}`)
      }
      const { branch } = ctx.input

      const sourceDir = resolveSafeChildPath(
        ctx.workspacePath,
        ctx.input.sourcePath ?? '.',
      )
      const files = await readWorkspaceFiles(sourceDir)
      if (!files.length) {
        throw new Error(
          `No files to commit in ${ctx.input.sourcePath ?? 'the workspace'}`,
        )
      }

      const repoPaths = files.map(file =>
        toRepoPath(ctx.input.targetPath, file.path),
      )

      const octokit = createUserOctokit(
        ctx.secrets,
        ctx.input.userCredentialsSecretKey,
      )

      try {
        const { data: ref } = await octokit.request(
          'GET /repos/{owner}/{repo}/git/ref/{ref}',
          { owner, repo, ref: `heads/${branch}` },
        )
        const parentSha = ref.object.sha
        const { data: parent } = await octokit.request(
          'GET /repos/{owner}/{repo}/git/commits/{commit_sha}',
          { owner, repo, commit_sha: parentSha },
        )

        const tree = await Promise.all(
          files.map(async (file, index) => {
            const { data: blob } = await octokit.request(
              'POST /repos/{owner}/{repo}/git/blobs',
              { owner, repo, content: file.content, encoding: 'base64' },
            )
            return {
              path: repoPaths[index],
              mode: (file.executable ? '100755' : '100644') as
                | '100755'
                | '100644',
              type: 'blob' as const,
              sha: blob.sha,
            }
          }),
        )

        const { data: newTree } = await octokit.request(
          'POST /repos/{owner}/{repo}/git/trees',
          { owner, repo, base_tree: parent.tree.sha, tree },
        )
        const { data: commit } = await octokit.request(
          'POST /repos/{owner}/{repo}/git/commits',
          {
            owner,
            repo,
            message: ctx.input.commitMessage,
            tree: newTree.sha,
            parents: [parentSha],
          },
        )
        ctx.output('commitSha', commit.sha)

        if (!ctx.input.push) {
          ctx.logger.info(
            `Created commit ${commit.sha} with ${files.length} file(s) on top of ${owner}/${repo}@${branch} without pushing it`,
          )
          return
        }

        // Not forced, so this fails rather than overwriting commits pushed
        // to the branch since it was read.
        await octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
          owner,
          repo,
          ref: `heads/${branch}`,
          sha: commit.sha,
          force: false,
        })
        ctx.logger.info(
          `Committed ${files.length} file(s) to ${owner}/${repo}@${branch} (${commit.sha})`,
        )
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown GitHub API error'
        throw new Error(
          `Failed to commit files to ${owner}/${repo}@${branch}: ${message}`,
        )
      }
    },
  })
}

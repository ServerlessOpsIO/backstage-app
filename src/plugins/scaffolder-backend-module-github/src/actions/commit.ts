import { execFile } from 'node:child_process'
import { createTemplateAction } from '@backstage/plugin-scaffolder-node'

type GitError = Error & { stderr?: string }

function runGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stderr: String(stderr ?? '') }))
        return
      }
      resolve(String(stdout ?? '').trim())
    })
  })
}

export function commitGitChangesAction() {
  return createTemplateAction({
    id: 'x_github:commit',
    description:
      'Commits all changes in the workspace git repository on the checked-out branch',
    schema: {
      input: {
        commitMessage: z =>
          z.string({
            description: 'Message for the commit',
          }),
        gitAuthorName: z =>
          z
            .string({
              description: 'Name of the commit author',
            })
            .optional(),
        gitAuthorEmail: z =>
          z
            .string({
              description: 'Email of the commit author',
            })
            .optional(),
      },
      output: {
        commitSha: z =>
          z.string({
            description:
              'SHA of the new commit, or of the current commit if there was nothing to commit',
          }),
        committed: z =>
          z.boolean({
            description: 'Whether there were changes to commit',
          }),
      },
    },
    async handler(ctx) {
      const git = (...args: string[]) => runGit(args, ctx.workspacePath)

      try {
        await git('add', '--all')
        const changes = await git('status', '--porcelain')
        if (changes) {
          const identity = [
            ...(ctx.input.gitAuthorName
              ? ['-c', `user.name=${ctx.input.gitAuthorName}`]
              : []),
            ...(ctx.input.gitAuthorEmail
              ? ['-c', `user.email=${ctx.input.gitAuthorEmail}`]
              : []),
          ]
          await git(...identity, 'commit', '--message', ctx.input.commitMessage)
        }

        const commitSha = await git('rev-parse', 'HEAD')
        ctx.output('commitSha', commitSha)
        ctx.output('committed', Boolean(changes))
        ctx.logger.info(
          changes
            ? `Committed ${changes.split('\n').length} change(s) as ${commitSha}`
            : `No changes to commit; the current commit is ${commitSha}`,
        )
      } catch (error: unknown) {
        const { message, stderr } = error as GitError
        const details = stderr?.trim()
          ? `${message}; stderr: ${stderr.trim()}`
          : message
        throw new Error(
          `Failed to commit changes in ${ctx.workspacePath}: ${details}`,
          { cause: error },
        )
      }
    },
  })
}

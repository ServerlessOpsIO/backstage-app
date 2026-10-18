import fs from 'node:fs'
import { resolveSafeChildPath } from '@backstage/backend-plugin-api'
import {
  cloneRepo,
  createTemplateAction,
} from '@backstage/plugin-scaffolder-node'
import git from 'isomorphic-git'

import { parseRepoUrl } from './common'

export function cloneGithubRepoAction() {
  return createTemplateAction({
    id: 'x_github:clone',
    description:
      'Clones a GitHub repository, including its git history, into the workspace',
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
                'Branch to clone and check out. Defaults to the repository default branch.',
            })
            .optional(),
        targetPath: z =>
          z
            .string({
              description:
                'Workspace directory to clone into. Defaults to the workspace root.',
            })
            .optional(),
        depth: z =>
          z
            .number({
              description:
                'Number of commits of history to fetch. Defaults to 1, the latest commit only.',
            })
            .int()
            .positive()
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
          z
            .string({
              description: 'Branch checked out in the clone',
            })
            .optional(),
        commitSha: z =>
          z.string({
            description: 'SHA of the commit checked out in the clone',
          }),
      },
    },
    async handler(ctx) {
      const { host, owner, repo } = parseRepoUrl(ctx.input.repoUrl)
      if (host !== 'github.com') {
        throw new Error(`Unsupported repo host for cloning: ${host}`)
      }

      const secretKey = ctx.input.userCredentialsSecretKey ?? 'USER_GITHUB_TOKEN'
      const token = ctx.secrets?.[secretKey]
      if (!token || typeof token !== 'string') {
        throw new Error(
          `Missing GitHub user token secret "${secretKey}". Configure requestUserCredentials in the template step to provide this secret.`,
        )
      }

      const dir = resolveSafeChildPath(
        ctx.workspacePath,
        ctx.input.targetPath ?? '.',
      )
      const url = `https://github.com/${owner}/${repo}.git`

      try {
        // The token is only used to fetch; the clone's origin is the plain URL.
        await cloneRepo({
          url,
          dir,
          auth: { username: 'x-access-token', password: token },
          logger: ctx.logger,
          ref: ctx.input.branch,
          depth: ctx.input.depth ?? 1,
        })

        const branch = await git.currentBranch({ fs, dir, fullname: false })
        const commitSha = await git.resolveRef({ fs, dir, ref: 'HEAD' })
        if (branch) {
          ctx.output('branch', branch)
        }
        ctx.output('commitSha', commitSha)
        ctx.logger.info(
          `Cloned ${owner}/${repo}${branch ? `@${branch}` : ''} (${commitSha}) into ${dir}`,
        )
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(
          `Failed to clone ${owner}/${repo} into ${dir}: ${message}`,
          { cause: error },
        )
      }
    },
  })
}

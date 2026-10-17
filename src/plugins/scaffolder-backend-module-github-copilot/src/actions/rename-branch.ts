import { createTemplateAction } from '@backstage/plugin-scaffolder-node'

import { createUserOctokit, parseRepoUrl } from './common'

export function renameGithubBranchAction() {
  return createTemplateAction({
    id: 'github:branch:rename',
    description: 'Renames a branch of a GitHub repository',
    schema: {
      input: {
        repoUrl: z =>
          z.string({
            description: 'GitHub repository URL in Backstage repoUrl format',
          }),
        branch: z =>
          z.string({
            description: 'Current name of the branch',
          }),
        newName: z =>
          z.string({
            description: 'New name for the branch',
          }),
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
            description: 'Name of the branch after renaming',
          }),
      },
    },
    async handler(ctx) {
      const { host, owner, repo } = parseRepoUrl(ctx.input.repoUrl)
      if (host !== 'github.com') {
        throw new Error(`Unsupported repo host for renaming a branch: ${host}`)
      }
      const { branch, newName } = ctx.input
      if (!newName.trim()) {
        throw new Error('A non-empty newName is required to rename a branch')
      }

      if (branch === newName) {
        ctx.logger.info(`Branch ${branch} already has the requested name`)
        ctx.output('branch', branch)
        return
      }

      const octokit = createUserOctokit(
        ctx.secrets,
        ctx.input.userCredentialsSecretKey,
      )

      try {
        const { data } = await octokit.request(
          'POST /repos/{owner}/{repo}/branches/{branch}/rename',
          { owner, repo, branch, new_name: newName },
        )
        const renamed = (data as { name?: string }).name ?? newName
        ctx.output('branch', renamed)
        ctx.logger.info(`Renamed ${owner}/${repo}@${branch} to ${renamed}`)
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown GitHub API error'
        throw new Error(
          `Failed to rename ${owner}/${repo}@${branch} to ${newName}: ${message}`,
        )
      }
    },
  })
}

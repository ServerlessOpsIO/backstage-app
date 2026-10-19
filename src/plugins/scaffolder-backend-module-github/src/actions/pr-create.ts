import { createTemplateAction } from '@backstage/plugin-scaffolder-node'

import { createUserOctokit, parseRepoUrl, readDefaultBranch } from './common'

type PullRequest = { html_url: string; number: number }

export function createGithubPullRequestAction() {
  return createTemplateAction({
    id: 'x_github:pr:create',
    description:
      'Opens a pull request from an existing branch of a GitHub repository, or returns the open pull request if there already is one',
    schema: {
      input: {
        repoUrl: z =>
          z.string({
            description: 'GitHub repository URL in Backstage repoUrl format',
          }),
        head: z =>
          z.string({
            description: 'Existing branch with the changes to merge',
          }),
        base: z =>
          z
            .string({
              description:
                'Branch to merge the changes into. Defaults to the repository default branch.',
            })
            .optional(),
        title: z =>
          z.string({
            description: 'Title of the pull request',
          }),
        description: z =>
          z
            .string({
              description: 'Body of the pull request',
            })
            .optional(),
        draft: z =>
          z
            .boolean({
              description:
                'If true, open the pull request as a draft. Defaults to false.',
            })
            .optional(),
        labels: z =>
          z
            .array(z.string(), {
              description:
                'Labels to add to the pull request. Labels that do not exist in the repository are created.',
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
        pullRequestUrl: z =>
          z.string({
            description: 'URL of the pull request',
          }),
        pullRequestNumber: z =>
          z.number({
            description: 'Number of the pull request',
          }),
      },
    },
    async handler(ctx) {
      const { host, owner, repo } = parseRepoUrl(ctx.input.repoUrl)
      if (host !== 'github.com') {
        throw new Error(
          `Unsupported repo host for opening a pull request: ${host}`,
        )
      }
      const { head } = ctx.input

      const octokit = createUserOctokit(
        ctx.secrets,
        ctx.input.userCredentialsSecretKey,
      )
      const base =
        ctx.input.base ?? (await readDefaultBranch(octokit, owner, repo))

      let pullRequest: PullRequest
      try {
        // Reuse an open pull request for the same branches, such as one a
        // Copilot task already opened, instead of failing on a duplicate.
        const { data: existing } = await octokit.request(
          'GET /repos/{owner}/{repo}/pulls',
          { owner, repo, head: `${owner}:${head}`, base, state: 'open' },
        )
        if (existing.length) {
          pullRequest = existing[0] as PullRequest
          ctx.logger.info(
            `Pull request already open from ${head} into ${base}: ${pullRequest.html_url}`,
          )
        } else {
          const { data: created } = await octokit.request(
            'POST /repos/{owner}/{repo}/pulls',
            {
              owner,
              repo,
              head,
              base,
              title: ctx.input.title,
              body: ctx.input.description,
              draft: ctx.input.draft ?? false,
            },
          )
          pullRequest = created as PullRequest
          ctx.logger.info(
            `Opened pull request from ${head} into ${base}: ${pullRequest.html_url}`,
          )
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown GitHub API error'
        throw new Error(
          `Failed to open a pull request from ${head} into ${base} in ${owner}/${repo}: ${message}`,
        )
      }

      const labels = ctx.input.labels ?? []
      if (labels.length) {
        try {
          // Pull requests are issues to GitHub, so labels go through the
          // issues API. This adds to the labels a reused pull request has.
          await octokit.request(
            'POST /repos/{owner}/{repo}/issues/{issue_number}/labels',
            { owner, repo, issue_number: pullRequest.number, labels },
          )
          ctx.logger.info(
            `Labeled pull request ${pullRequest.number}: ${labels.join(', ')}`,
          )
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : 'Unknown GitHub API error'
          throw new Error(
            `Failed to label pull request ${pullRequest.html_url}: ${message}`,
          )
        }
      }

      ctx.output('pullRequestUrl', pullRequest.html_url)
      ctx.output('pullRequestNumber', pullRequest.number)
    },
  })
}

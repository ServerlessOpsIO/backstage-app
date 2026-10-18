import { createTemplateAction } from '@backstage/plugin-scaffolder-node'

import { createUserOctokit, parseRepoUrl } from './common'

type IssueComment = { html_url: string; id: number }

export function createGithubPullRequestCommentAction() {
  return createTemplateAction({
    id: 'x_github:pr:comment',
    description: 'Posts a comment on a pull request of a GitHub repository',
    schema: {
      input: {
        repoUrl: z =>
          z.string({
            description: 'GitHub repository URL in Backstage repoUrl format',
          }),
        pullRequestNumber: z =>
          z
            .number({
              description: 'Number of the pull request to comment on',
            })
            .int()
            .positive(),
        body: z =>
          z.string({
            description: 'Markdown text of the comment',
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
        commentUrl: z =>
          z.string({
            description: 'URL of the comment',
          }),
        commentId: z =>
          z.number({
            description: 'ID of the comment',
          }),
      },
    },
    async handler(ctx) {
      const { host, owner, repo } = parseRepoUrl(ctx.input.repoUrl)
      if (host !== 'github.com') {
        throw new Error(
          `Unsupported repo host for commenting on a pull request: ${host}`,
        )
      }
      const { pullRequestNumber } = ctx.input

      const octokit = createUserOctokit(
        ctx.secrets,
        ctx.input.userCredentialsSecretKey,
      )

      let comment: IssueComment
      try {
        // Pull requests are issues to GitHub, so conversation comments go
        // through the issues API.
        const { data } = await octokit.request(
          'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
          {
            owner,
            repo,
            issue_number: pullRequestNumber,
            body: ctx.input.body,
          },
        )
        comment = data as IssueComment
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown GitHub API error'
        throw new Error(
          `Failed to comment on pull request ${pullRequestNumber} in ${owner}/${repo}: ${message}`,
        )
      }

      ctx.logger.info(
        `Commented on pull request ${pullRequestNumber}: ${comment.html_url}`,
      )
      ctx.output('commentUrl', comment.html_url)
      ctx.output('commentId', comment.id)
    },
  })
}

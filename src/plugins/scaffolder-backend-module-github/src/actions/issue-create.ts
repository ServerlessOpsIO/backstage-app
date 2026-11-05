import { createTemplateAction } from '@backstage/plugin-scaffolder-node'

import { createUserOctokit, parseRepoUrl } from './common'

type Issue = { html_url: string; number: number }

export function createGithubIssueAction() {
  return createTemplateAction({
    id: 'x_github:issue:create',
    description: 'Creates an issue in a GitHub repository',
    schema: {
      input: {
        repoUrl: z =>
          z.string({
            description: 'GitHub repository URL in Backstage repoUrl format',
          }),
        title: z =>
          z.string({
            description: 'Title of the issue',
          }),
        body: z =>
          z.string({
            description: 'Markdown text of the issue',
          }),
        labels: z =>
          z
            .array(z.string(), {
              description: 'Labels to apply to the issue',
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
        issueUrl: z =>
          z.string({
            description: 'URL of the issue',
          }),
        issueNumber: z =>
          z.number({
            description: 'Number of the issue',
          }),
      },
    },
    async handler(ctx) {
      const { host, owner, repo } = parseRepoUrl(ctx.input.repoUrl)
      if (host !== 'github.com') {
        throw new Error(`Unsupported repo host for creating an issue: ${host}`)
      }

      const octokit = createUserOctokit(
        ctx.secrets,
        ctx.input.userCredentialsSecretKey,
      )

      // The task ID is shared by retries of a run and differs between runs.
      const marker = `<!-- spec-key: ${ctx.task.id} -->`

      let issue: Issue | undefined
      try {
        const { data: found } = await octokit.request('GET /search/issues', {
          q: `"spec-key: ${ctx.task.id}" repo:${owner}/${repo} type:issue in:body`,
          per_page: 10,
        })
        issue = (
          found.items as Array<Issue & { body?: string | null }>
        ).find(item => item.body?.includes(marker))

        if (issue) {
          ctx.logger.info(`Reusing existing issue ${issue.html_url}`)
        } else {
          const { data } = await octokit.request(
            'POST /repos/{owner}/{repo}/issues',
            {
              owner,
              repo,
              title: ctx.input.title,
              body: `${ctx.input.body}\n\n${marker}`,
              ...(ctx.input.labels ? { labels: ctx.input.labels } : {}),
            },
          )
          issue = data as Issue
          ctx.logger.info(`Created issue ${issue.html_url}`)
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown GitHub API error'
        throw new Error(
          `Failed to create issue in ${owner}/${repo}: ${message}`,
        )
      }

      ctx.output('issueUrl', issue.html_url)
      ctx.output('issueNumber', issue.number)
    },
  })
}

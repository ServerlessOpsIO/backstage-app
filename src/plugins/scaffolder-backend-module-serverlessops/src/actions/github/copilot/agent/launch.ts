import { createTemplateAction } from '@backstage/plugin-scaffolder-node'

type RepoDetails = {
    host: string
    owner: string
    repo: string
}

function parseRepoUrl(repoUrl: string): RepoDetails {
    const [host, queryString] = repoUrl.split('?')
    const searchParams = new URLSearchParams(queryString)
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')

    if (!host || !owner || !repo) {
        throw new Error(`Invalid repoUrl: ${repoUrl}`)
    }

    return { host, owner, repo }
}

export function launchGithubCopilotAgentAction() {
    return createTemplateAction({
        id: 'github:copilot:agent:launch',
        description: 'Launches a GitHub Copilot agent task for a repository',
        schema: {
            input: {
                repoUrl: z => z.string({
                    description: 'GitHub repository URL in Backstage repoUrl format',
                }),
                prompt: z => z.string({
                    description: 'Initial prompt for the Copilot coding agent',
                }),
                githubToken: z => z.string({
                    description: 'GitHub token with access to launch Copilot agent tasks',
                }).optional(),
                baseRef: z => z.string({
                    description: 'Branch that the Copilot task should start from',
                }).optional(),
                model: z => z.string({
                    description: 'Optional model override for the Copilot task',
                }).optional(),
                createPullRequest: z => z.boolean({
                    description: 'If true, request the task to create a pull request',
                }).optional(),
            },
            output: {
                taskId: z => z.string({
                    description: 'ID of the launched Copilot agent task',
                }).optional(),
                taskUrl: z => z.string({
                    description: 'URL of the launched Copilot agent task',
                }).optional(),
            },
        },
        async handler(ctx) {
            const prompt = (ctx.input.prompt as string).trim()
            if (!prompt) {
                throw new Error('A non-empty prompt is required to launch a Copilot agent')
            }

            const token =
                (ctx.input.githubToken as string | undefined) ??
                ctx.secrets?.githubToken
            if (!token) {
                throw new Error('Missing GitHub token. Set input.githubToken or secrets.githubToken')
            }

            const { host, owner, repo } = parseRepoUrl(ctx.input.repoUrl as string)
            if (host !== 'github.com') {
                throw new Error(`Unsupported repo host for Copilot agent launch: ${host}`)
            }

            const response = await fetch(`https://api.github.com/agents/repos/${owner}/${repo}/tasks`, {
                method: 'POST',
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `******
                    'Content-Type': 'application/json',
                    'X-GitHub-Api-Version': '2026-03-10',
                },
                body: JSON.stringify({
                    prompt,
                    base_ref: (ctx.input.baseRef as string | undefined) ?? 'main',
                    model: (ctx.input.model as string | undefined) ?? 'auto',
                    create_pull_request: (ctx.input.createPullRequest as boolean | undefined) ?? true,
                }),
            })

            const responseText = await response.text()
            let body: Record<string, unknown> = {}

            if (responseText) {
                try {
                    body = JSON.parse(responseText)
                } catch {
                    body = {}
                }
            }

            if (!response.ok) {
                throw new Error(
                    `Failed to launch Copilot agent task: ${response.status} ${response.statusText}`,
                )
            }

            if (body?.id) {
                ctx.output('taskId', String(body.id))
            }

            if (body?.html_url) {
                ctx.output('taskUrl', String(body.html_url))
            }

            ctx.logger.info(`Launched Copilot agent task for ${owner}/${repo}`)
        },
    })
}

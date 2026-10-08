import { createTemplateAction } from '@backstage/plugin-scaffolder-node'
import { Octokit } from 'octokit'

type RepoDetails = {
  host: string
  owner: string
  repo: string
}

const GITHUB_API_VERSION = '2026-03-10'

const TASK_POLL_INTERVAL_MS = 30_000
const PENDING_TASK_STATES = ['queued', 'in_progress']

function extractTaskIdFromUrl(taskUrl: string): string | undefined {
  const match = taskUrl.match(/\/(\d+)(?:\/)?$/)
  return match?.[1]
}

function normalizeTaskId(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }
  return undefined
}

function readTaskState(
  body: Record<string, unknown>,
  nestedTask?: Record<string, unknown>,
): string | undefined {
  if (typeof body.state === 'string') {
    return body.state
  }
  if (typeof nestedTask?.state === 'string') {
    return nestedTask.state
  }
  return undefined
}

function readHeadRef(
  task: Record<string, unknown> | undefined,
): string | undefined {
  const artifacts = Array.isArray(task?.artifacts) ? task.artifacts : []
  for (const artifact of artifacts) {
    const data = artifact?.data
    if (artifact?.type === 'branch' && typeof data?.head_ref === 'string') {
      return data.head_ref
    }
  }
  const sessions = Array.isArray(task?.sessions) ? task.sessions : []
  for (const session of [...sessions].reverse()) {
    if (typeof session?.head_ref === 'string') {
      return session.head_ref
    }
  }
  return undefined
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abortError = () =>
      new Error('Stopped waiting for the Copilot agent task: step was aborted')
    if (signal?.aborted) {
      reject(abortError())
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(abortError())
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
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

export function createGithubCopilotAgentAction(options: {
  id: string
  description: string
  customAgent?: string
  skillCommand?: string
}) {
  return createTemplateAction({
    id: options.id,
    description: options.description,
    schema: {
      input: z => {
        const inputSchema = z.object({
          repoUrl: z.string({
            description: 'GitHub repository URL in Backstage repoUrl format',
          }),
          prompt: z.string({
            description: 'Initial prompt for the Copilot coding agent',
          }),
          baseRef: z
            .string({
              description: 'Branch that the Copilot task should start from',
            })
            .optional(),
          model: z
            .string({
              description: 'Optional model override for the Copilot task',
            })
            .optional(),
          customAgent: z
            .string({
              description: 'Optional name of a custom Copilot agent to use',
            })
            .optional(),
          createPullRequest: z
            .boolean({
              description: 'If true, request the task to create a pull request',
            })
            .optional(),
          userCredentialsSecretKey: z
            .string({
              description:
                'Secret key containing the GitHub user token from requestUserCredentials',
            })
            .optional(),
          waitForCompletion: z
            .boolean({
              description:
                'If true, wait for the Copilot task to finish and fail the step unless it completes successfully. Defaults to false.',
            })
            .optional(),
        })
        if (options.skillCommand) {
          return inputSchema.omit({ customAgent: true }).extend({
            integrationType: z
              .enum(['skill', 'agent'], {
                description:
                  'Whether to run the Spec Kit command as a skill or as a custom agent. Defaults to skill.',
              })
              .optional(),
          })
        }
        return options.customAgent
          ? inputSchema.omit({ customAgent: true })
          : inputSchema
      },
      output: {
        taskId: z =>
          z
            .string({
              description: 'ID of the launched Copilot agent task',
            })
            .optional(),
        taskUrl: z =>
          z
            .string({
              description: 'URL of the launched Copilot agent task',
            })
            .optional(),
        headRef: z =>
          z
            .string({
              description:
                'Branch the Copilot agent task works on, once GitHub reports it',
            })
            .optional(),
        taskState: z =>
          z
            .string({
              description:
                'Last known state of the Copilot agent task, such as queued or completed',
            })
            .optional(),
      },
    },
    async handler(ctx) {
      const userPrompt = (ctx.input.prompt as string).trim()
      if (!userPrompt) {
        throw new Error(
          'A non-empty prompt is required to launch a Copilot agent',
        )
      }

      const integrationType =
        ('integrationType' in ctx.input
          ? ctx.input.integrationType
          : undefined) ?? 'skill'
      if (integrationType !== 'skill' && integrationType !== 'agent') {
        throw new Error(
          `Unsupported integrationType: ${String(integrationType)}. Use "skill" or "agent".`,
        )
      }
      const useSkill =
        Boolean(options.skillCommand) && integrationType === 'skill'
      const prompt = useSkill
        ? `${options.skillCommand} ${userPrompt}`
        : userPrompt

      const { host, owner, repo } = parseRepoUrl(ctx.input.repoUrl as string)
      if (host !== 'github.com') {
        throw new Error(
          `Unsupported repo host for Copilot agent launch: ${host}`,
        )
      }

      const userCredentialsSecretKey =
        (ctx.input.userCredentialsSecretKey as string | undefined) ??
        'USER_GITHUB_TOKEN'
      const userGithubToken = ctx.secrets?.[userCredentialsSecretKey]

      if (!userGithubToken || typeof userGithubToken !== 'string') {
        throw new Error(
          `Missing GitHub user token secret "${userCredentialsSecretKey}". Configure requestUserCredentials in the template step to provide this secret.`,
        )
      }

      const octokit = new Octokit({
        auth: userGithubToken,
        request: {
          headers: {
            'X-GitHub-Api-Version': GITHUB_API_VERSION,
          },
        },
      })

      let taskId: string | undefined
      let taskState: string | undefined
      let headRef: string | undefined
      try {
        const requestBody: Record<string, unknown> = {
          owner,
          repo,
          prompt,
          create_pull_request:
            (ctx.input.createPullRequest as boolean | undefined) ?? true,
        }
        const model = ctx.input.model as string | undefined
        if (model) {
          requestBody.model = model
        }
        const baseRef = ctx.input.baseRef as string | undefined
        if (baseRef) {
          requestBody.base_ref = baseRef
        }
        const customAgent = useSkill
          ? undefined
          : options.customAgent ??
            ('customAgent' in ctx.input ? ctx.input.customAgent : undefined)
        if (customAgent) {
          requestBody.custom_agent = customAgent
        }

        const response = await octokit.request(
          'POST /agents/repos/{owner}/{repo}/tasks',
          requestBody,
        )
        const body = response.data as Record<string, unknown>

        const nestedTask =
          typeof body.task === 'object' && body.task !== null
            ? (body.task as Record<string, unknown>)
            : undefined
        let taskUrl: string | undefined
        if (typeof body.html_url === 'string') {
          taskUrl = body.html_url
        } else if (typeof body.task_url === 'string') {
          taskUrl = body.task_url
        } else if (typeof nestedTask?.html_url === 'string') {
          taskUrl = nestedTask.html_url
        }
        taskState = readTaskState(body, nestedTask)
        headRef = readHeadRef(body) ?? readHeadRef(nestedTask) ?? headRef
        taskId =
          normalizeTaskId(body.id) ??
          normalizeTaskId(body.task_id) ??
          normalizeTaskId(nestedTask?.id) ??
          normalizeTaskId(nestedTask?.task_id) ??
          (taskUrl ? extractTaskIdFromUrl(taskUrl) : undefined)

        if (taskId) {
          ctx.output('taskId', taskId)
        }

        if (taskUrl) {
          ctx.output('taskUrl', String(taskUrl))
        }

        ctx.logger.info(
          `Launched Copilot agent task for ${owner}/${repo}${
            taskId ? ` (taskId=${String(taskId)})` : ''
          }`,
        )
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown GitHub API error'
        throw new Error(`Failed to launch Copilot agent task: ${message}`)
      }

      if (!ctx.input.waitForCompletion) {
        if (headRef) {
          ctx.output('headRef', headRef)
        }
        if (taskState) {
          ctx.output('taskState', taskState)
        }
        return
      }

      if (!taskId) {
        throw new Error(
          'Cannot wait for the Copilot agent task: GitHub did not return a task ID',
        )
      }

      while (!taskState || PENDING_TASK_STATES.includes(taskState)) {
        ctx.logger.info(
          `Copilot agent task ${taskId} is ${
            taskState ?? 'starting'
          }; checking again in ${TASK_POLL_INTERVAL_MS / 1000} seconds`,
        )
        await sleep(TASK_POLL_INTERVAL_MS, ctx.signal)

        let body: Record<string, unknown>
        try {
          const response = await octokit.request(
            'GET /agents/repos/{owner}/{repo}/tasks/{task_id}',
            { owner, repo, task_id: taskId },
          )
          body = response.data as Record<string, unknown>
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : 'Unknown GitHub API error'
          throw new Error(
            `Failed to check Copilot agent task ${taskId} status: ${message}`,
          )
        }

        const nestedTask =
          typeof body.task === 'object' && body.task !== null
            ? (body.task as Record<string, unknown>)
            : undefined
        taskState = readTaskState(body, nestedTask)
        headRef = readHeadRef(body) ?? readHeadRef(nestedTask) ?? headRef
        if (!taskState) {
          throw new Error(
            `Failed to check Copilot agent task ${taskId} status: GitHub did not return a task state`,
          )
        }
      }

      if (headRef) {
        ctx.output('headRef', headRef)
      }
      ctx.output('taskState', taskState)
      if (taskState !== 'completed') {
        throw new Error(
          `Copilot agent task ${taskId} finished with state "${taskState}"`,
        )
      }
      ctx.logger.info(`Copilot agent task ${taskId} completed`)
    },
  })
}

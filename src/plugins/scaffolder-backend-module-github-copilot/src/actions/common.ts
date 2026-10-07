/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createTemplateAction } from '@backstage/plugin-scaffolder-node'
import { Octokit } from 'octokit'

type RepoDetails = {
  host: string
  owner: string
  repo: string
}

const GITHUB_API_VERSION = '2026-03-10'

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
        })
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
      },
    },
    async handler(ctx) {
      const prompt = (ctx.input.prompt as string).trim()
      if (!prompt) {
        throw new Error(
          'A non-empty prompt is required to launch a Copilot agent',
        )
      }

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

      try {
        const requestBody: Record<string, unknown> = {
          owner,
          repo,
          prompt,
          model: (ctx.input.model as string | undefined) ?? 'auto',
          create_pull_request:
            (ctx.input.createPullRequest as boolean | undefined) ?? true,
        }
        const baseRef = ctx.input.baseRef as string | undefined
        if (baseRef) {
          requestBody.base_ref = baseRef
        }
        const customAgent =
          options.customAgent ??
          ('customAgent' in ctx.input ? ctx.input.customAgent : undefined)
        if (customAgent) {
          requestBody.agent = customAgent
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
        const taskId =
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
    },
  })
}

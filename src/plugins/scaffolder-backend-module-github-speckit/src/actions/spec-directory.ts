import type { CompletedCopilotAgentTask } from '@internal/backstage-plugin-scaffolder-backend-module-github-copilot'
import { Octokit } from 'octokit'

export type SpecDirectory = {
  specDirectory: string
  specId?: string
  specName: string
}

const SPEC_FILE_PATTERN = /^specs\/([^/]+)\/spec\.md$/
// Spec Kit prefixes feature directories with a timestamp (YYYYMMDD-HHMMSS) or
// a sequential number, depending on its feature_numbering setting.
const SPEC_ID_PATTERN = /^(\d{8}-\d{6}|\d+)-(.+)$/

export function parseSpecDirectoryName(
  directoryName: string,
): Omit<SpecDirectory, 'specDirectory'> {
  const match = directoryName.match(SPEC_ID_PATTERN)
  if (!match) {
    return { specName: directoryName }
  }
  return { specId: match[1], specName: match[2] }
}

/**
 * Finds the Spec Kit feature directory that was added on `head` compared with
 * `base`, by looking for exactly one new specs/<directory>/spec.md file.
 */
export async function findNewSpecDirectory(
  octokit: Octokit,
  options: { owner: string; repo: string; base: string; head: string },
): Promise<SpecDirectory> {
  const { owner, repo, base, head } = options

  let files: Array<{ filename?: string; status?: string }>
  try {
    const response = await octokit.request(
      'GET /repos/{owner}/{repo}/compare/{basehead}',
      { owner, repo, basehead: `${base}...${head}` },
    )
    files = (response.data as { files?: typeof files }).files ?? []
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown GitHub API error'
    throw new Error(
      `Failed to compare ${head} with ${base} to find the new spec: ${message}`,
    )
  }

  const directoryNames = files
    .filter(file => file.status === 'added')
    .map(file => file.filename?.match(SPEC_FILE_PATTERN)?.[1])
    .filter((name): name is string => Boolean(name))

  if (directoryNames.length !== 1) {
    const found = directoryNames.length
      ? `found ${directoryNames.length}: ${directoryNames.join(', ')}`
      : 'found none'
    throw new Error(
      `Expected ${head} to add exactly one specs/<directory>/spec.md compared with ${base}, but ${found}`,
    )
  }

  const directoryName = directoryNames[0]
  return {
    specDirectory: `specs/${directoryName}`,
    ...parseSpecDirectoryName(directoryName),
  }
}

export async function readDefaultBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<string> {
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}', {
      owner,
      repo,
    })
    return (response.data as { default_branch: string }).default_branch
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown GitHub API error'
    throw new Error(
      `Failed to read the default branch of ${owner}/${repo}: ${message}`,
    )
  }
}

/** Outputs that report the spec a Copilot agent task created. */
export const SPEC_DIRECTORY_OUTPUTS = {
  specDirectory:
    'Spec Kit feature directory the task added, such as specs/20261012-143000-add-login. Requires waitForCompletion.',
  specId:
    'Timestamp or number that prefixes the feature directory. Requires waitForCompletion.',
  specName:
    'Feature directory name without its timestamp or number prefix. Requires waitForCompletion.',
}

/**
 * Finds the spec a completed Copilot agent task added and sets the
 * SPEC_DIRECTORY_OUTPUTS outputs.
 */
export async function outputNewSpecDirectory(
  task: CompletedCopilotAgentTask,
): Promise<void> {
  const { octokit, owner, repo, taskId, headRef } = task
  if (!headRef) {
    throw new Error(
      `Cannot find the spec created by Copilot agent task ${taskId}: GitHub did not report the task's branch`,
    )
  }
  const base =
    task.baseRef ?? (await readDefaultBranch(octokit, owner, repo))
  const spec = await findNewSpecDirectory(octokit, {
    owner,
    repo,
    base,
    head: headRef,
  })
  task.output('specDirectory', spec.specDirectory)
  if (spec.specId) {
    task.output('specId', spec.specId)
  }
  task.output('specName', spec.specName)
  task.logger.info(`Copilot agent task created ${spec.specDirectory}`)
}

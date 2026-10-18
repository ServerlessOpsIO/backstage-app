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

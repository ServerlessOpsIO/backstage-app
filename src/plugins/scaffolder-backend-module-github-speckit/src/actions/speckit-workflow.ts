import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  LoggerService,
  resolveSafeChildPath,
} from '@backstage/backend-plugin-api'
import { createTemplateAction } from '@backstage/plugin-scaffolder-node'

import { parseSpecDirectoryName, SpecDirectory } from './spec-directory'

// Only the end of stdout is needed to read the run outcome, so cap how much
// of the agent CLIs' output is kept in memory.
const MAX_KEPT_OUTPUT_CHARS = 1024 * 1024

// Agent CLIs color their output; the scaffolder log shows plain text.
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_PATTERN = /\x1b\[[0-9;?]*[ -/]*[@-~]/g

type SpecifyError = Error & { stdout?: string; stderr?: string }

/** Splits streamed output into lines and passes each complete line on. */
function createLineWriter(onLine: (line: string) => void) {
  let pending = ''
  const emit = (line: string) => {
    const text = line.replace(ANSI_ESCAPE_PATTERN, '').trimEnd()
    if (text) {
      onLine(text)
    }
  }
  return {
    write(chunk: string) {
      const lines = (pending + chunk).split(/\r?\n/)
      pending = lines.pop() ?? ''
      lines.forEach(emit)
    },
    flush() {
      emit(pending)
      pending = ''
    },
  }
}

function keepTail(text: string): string {
  return text.length > MAX_KEPT_OUTPUT_CHARS
    ? text.slice(text.length - MAX_KEPT_OUTPUT_CHARS)
    : text
}

/**
 * Runs specify, writing its stdout and stderr to the step log line by line as
 * they arrive, and resolves with its stdout.
 */
function runSpecify(
  args: string[],
  cwd: string,
  githubToken: string | undefined,
  logger: LoggerService,
): Promise<string> {
  // Both the GitHub CLI that github steps run and the Copilot CLI that
  // command steps run read GH_TOKEN. The Copilot CLI prefers
  // COPILOT_GITHUB_TOKEN when the host sets it.
  const env = githubToken
    ? { ...process.env, GH_TOKEN: githubToken }
    : process.env

  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const stdoutLines = createLineWriter(line => logger.info(line))
    const stderrLines = createLineWriter(line => logger.info(line))

    const child = spawn('specify', args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      stdout = keepTail(stdout + chunk)
      stdoutLines.write(chunk)
    })
    child.stderr.on('data', (chunk: string) => {
      stderr = keepTail(stderr + chunk)
      stderrLines.write(chunk)
    })

    child.on('error', error => {
      reject(Object.assign(error, { stdout, stderr }))
    })
    child.on('close', (code, signal) => {
      stdoutLines.flush()
      stderrLines.flush()
      if (code === 0) {
        resolve(stdout)
        return
      }
      const reason = signal ? `signal ${signal}` : `exit code ${code}`
      // Keep the output so a failed run's outcome can still be read.
      reject(
        Object.assign(new Error(`specify exited with ${reason}`), {
          stdout,
          stderr,
        }),
      )
    })
  })
}

type WorkflowRunOutcome = {
  run_id?: string
  status?: string
  current_step_id?: string
  error?: string
  gate?: { step_id?: string; message?: string }
}

/**
 * Reads the run outcome that `specify workflow run --json` prints last. Agent
 * CLIs started by the workflow may write to the same stdout first, so this
 * looks for the last line that starts a JSON object that parses.
 */
export function parseWorkflowRunOutcome(
  stdout: string,
): WorkflowRunOutcome | undefined {
  const lines = stdout.split('\n')
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (!lines[index].startsWith('{')) {
      continue
    }
    try {
      const parsed = JSON.parse(lines.slice(index).join('\n'))
      if (parsed && typeof parsed === 'object' && 'status' in parsed) {
        return parsed as WorkflowRunOutcome
      }
    } catch {
      // Not the start of the outcome object; keep looking further up.
    }
  }
  return undefined
}

type StepResult = {
  type?: string
  status?: string
  error?: string | null
  output?: { stdout?: unknown; stderr?: unknown }
}

/**
 * Logs each step's result from the run state. Spec Kit streams command steps
 * as they run, but only records the output of steps such as shell steps, so
 * this is the only place that output shows up.
 */
async function logStepResults(
  runDir: string,
  logger: LoggerService,
): Promise<void> {
  let stepResults: Record<string, StepResult>
  try {
    const state = JSON.parse(
      await fs.readFile(path.join(runDir, 'state.json'), 'utf8'),
    )
    stepResults = state?.step_results ?? {}
  } catch {
    return
  }

  for (const [stepId, result] of Object.entries(stepResults)) {
    logger.info(
      `Step "${stepId}" (${result.type ?? 'step'}) ${result.status ?? 'ran'}${
        result.error ? `: ${result.error}` : ''
      }`,
    )
    for (const stream of ['stdout', 'stderr'] as const) {
      const text = result.output?.[stream]
      if (typeof text === 'string' && text.trim()) {
        const lines = createLineWriter(line =>
          logger.info(`[${stepId}] ${line}`),
        )
        lines.write(text)
        lines.flush()
      }
    }
  }
}

/**
 * Reads the feature directory that Spec Kit's specify command records in
 * .specify/feature.json, as a path relative to the workspace.
 */
async function readFeatureDirectory(
  workspacePath: string,
): Promise<string | undefined> {
  try {
    const featureJson = JSON.parse(
      await fs.readFile(
        path.join(workspacePath, '.specify', 'feature.json'),
        'utf8',
      ),
    )
    const featureDirectory = featureJson?.feature_directory
    if (typeof featureDirectory !== 'string' || !featureDirectory.trim()) {
      return undefined
    }
    const relative = path
      .relative(workspacePath, path.resolve(workspacePath, featureDirectory))
      .split(path.sep)
      .join('/')
    // Ignore a directory outside the workspace.
    return relative && !relative.startsWith('..') ? relative : undefined
  } catch {
    return undefined
  }
}

function toSpecDirectory(featureDirectory: string): SpecDirectory {
  return {
    specDirectory: featureDirectory,
    ...parseSpecDirectoryName(path.posix.basename(featureDirectory)),
  }
}

function describeFailure(outcome: WorkflowRunOutcome): string {
  if (outcome.status === 'paused') {
    const gate = outcome.gate?.step_id ?? outcome.current_step_id
    return `the workflow paused at gate step "${gate}"${
      outcome.gate?.message ? ` (${outcome.gate.message})` : ''
    }. Gates need someone to answer them, so remove gate steps from workflows run by the scaffolder`
  }
  const step = outcome.current_step_id
    ? ` at step "${outcome.current_step_id}"`
    : ''
  return `the workflow finished with status "${outcome.status}"${step}${
    outcome.error ? `: ${outcome.error}` : ''
  }`
}

export function runSpecKitWorkflowAction() {
  return createTemplateAction({
    id: 'github:speckit:workflow',
    description:
      'Runs a GitHub Spec Kit workflow in the generated project from the workflow YAML',
    schema: {
      input: {
        workflow: z =>
          z.string({
            description: 'Content of the Spec Kit workflow YAML to run',
          }),
        inputs: z =>
          z
            .record(z.union([z.string(), z.number(), z.boolean()]), {
              description:
                'Values for the inputs the workflow declares, by input name',
            })
            .optional(),
        userCredentialsSecretKey: z =>
          z
            .string({
              description:
                'Secret key containing the GitHub token for the agent CLIs the workflow runs. Defaults to USER_GITHUB_TOKEN; without that secret, the CLIs use the scaffolder host environment.',
            })
            .optional(),
      },
      output: {
        runId: z =>
          z
            .string({
              description: 'ID of the Spec Kit workflow run',
            })
            .optional(),
        status: z =>
          z
            .string({
              description: 'Final status of the workflow run',
            })
            .optional(),
        specDirectory: z =>
          z
            .string({
              description:
                'Feature directory a specify step in the run created, such as specs/20261012-143000-add-login',
            })
            .optional(),
        specPath: z =>
          z
            .string({
              description:
                'Absolute path of the feature directory in the scaffolder workspace',
            })
            .optional(),
        specId: z =>
          z
            .string({
              description:
                'Timestamp or number that prefixes the feature directory',
            })
            .optional(),
        specName: z =>
          z
            .string({
              description:
                'Feature directory name without its timestamp or number prefix',
            })
            .optional(),
      },
    },
    async handler(ctx) {
      if (!ctx.input.workflow.trim()) {
        throw new Error('A non-empty workflow is required to run Spec Kit')
      }

      // Keep the workflow file out of the workspace so it isn't published
      // with the generated project.
      const workflowDir = await ctx.createTemporaryDirectory()
      const workflowPath = path.join(workflowDir, 'workflow.yml')
      await fs.writeFile(workflowPath, ctx.input.workflow, 'utf8')

      const secretKey = ctx.input.userCredentialsSecretKey ?? 'USER_GITHUB_TOKEN'
      const githubToken = ctx.secrets?.[secretKey]
      if (
        ctx.input.userCredentialsSecretKey &&
        (!githubToken || typeof githubToken !== 'string')
      ) {
        throw new Error(
          `Missing GitHub token secret "${secretKey}". Configure requestUserCredentials in the template step to provide this secret.`,
        )
      }
      if (!githubToken) {
        ctx.logger.info(
          `No "${secretKey}" secret provided; Spec Kit commands use the GitHub credentials of the scaffolder host`,
        )
      }

      const inputArgs = Object.entries(ctx.input.inputs ?? {}).flatMap(
        ([name, value]) => ['--input', `${name}=${String(value)}`],
      )

      // A workspace can already record a feature from an earlier run, so only
      // report the spec if the run changes it.
      const featureDirectoryBefore = await readFeatureDirectory(
        ctx.workspacePath,
      )

      let stdout = ''
      let commandError: SpecifyError | undefined
      try {
        stdout = await runSpecify(
          ['workflow', 'run', workflowPath, ...inputArgs, '--json'],
          ctx.workspacePath,
          githubToken,
          ctx.logger,
        )
      } catch (error: unknown) {
        commandError = error as SpecifyError
        stdout = commandError.stdout ?? ''
      }

      const outcome = parseWorkflowRunOutcome(stdout)
      if (outcome?.run_id) {
        ctx.output('runId', outcome.run_id)
      }
      if (outcome?.status) {
        ctx.output('status', outcome.status)
      }

      const featureDirectory = await readFeatureDirectory(ctx.workspacePath)
      if (featureDirectory && featureDirectory !== featureDirectoryBefore) {
        const spec = toSpecDirectory(featureDirectory)
        ctx.output('specDirectory', spec.specDirectory)
        ctx.output(
          'specPath',
          resolveSafeChildPath(ctx.workspacePath, spec.specDirectory),
        )
        if (spec.specId) {
          ctx.output('specId', spec.specId)
        }
        ctx.output('specName', spec.specName)
        ctx.logger.info(`Spec Kit workflow created ${spec.specDirectory}`)
      }

      // Spec Kit keeps run state for resuming a run, which a scaffolder task
      // can't do, so remove it before a later step publishes the workspace.
      if (outcome?.run_id && /^[\w-]+$/.test(outcome.run_id)) {
        const runDir = resolveSafeChildPath(
          ctx.workspacePath,
          `.specify/workflows/runs/${outcome.run_id}`,
        )
        await logStepResults(runDir, ctx.logger)
        await fs.rm(runDir, { recursive: true, force: true })
      }

      if (outcome && outcome.status !== 'completed') {
        const runLabel = outcome.run_id ? ` ${outcome.run_id}` : ''
        throw new Error(
          `Spec Kit workflow run${runLabel} in ${
            ctx.workspacePath
          } did not complete: ${describeFailure(outcome)}`,
        )
      }
      if (commandError || !outcome) {
        const stderrMessage = commandError?.stderr?.trim()
        const details = commandError
          ? `${commandError.message}${
              stderrMessage ? `; stderr: ${stderrMessage}` : ''
            }`
          : 'specify did not report a run outcome'
        throw new Error(
          `Failed to run the Spec Kit workflow in ${ctx.workspacePath}: ${details}`,
          { cause: commandError },
        )
      }

      ctx.logger.info(
        `Spec Kit workflow run ${outcome.run_id} completed in ${ctx.workspacePath}`,
      )
    },
  })
}

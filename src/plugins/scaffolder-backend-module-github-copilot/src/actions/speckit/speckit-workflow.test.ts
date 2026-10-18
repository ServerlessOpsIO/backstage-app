import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { createMockDirectory } from '@backstage/backend-test-utils'
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import {
  parseWorkflowRunOutcome,
  runSpecKitWorkflowAction,
} from './speckit-workflow'

jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
}))

const spawnMock = spawn as unknown as jest.Mock

type FakeRun = {
  stdout?: string[]
  stderr?: string[]
  exitCode?: number
  error?: Error
}

// A child process that writes the given output chunks, then exits.
function fakeChild(run: FakeRun) {
  const child = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  })
  setImmediate(() => {
    if (run.error) {
      child.emit('error', run.error)
      return
    }
    run.stdout?.forEach(chunk => child.stdout.write(chunk))
    run.stderr?.forEach(chunk => child.stderr.write(chunk))
    child.stdout.end()
    child.stderr.end()
    setImmediate(() => child.emit('close', run.exitCode ?? 0, null))
  })
  return child
}

const workflowYaml = `schema_version: "1.0"
workflow:
  id: specify-plan
  name: Specify and plan
  version: 1.0.0
steps:
  - id: specify
    command: speckit.specify
    input:
      args: "{{ inputs.spec }}"
`

describe('github:copilot:speckit:workflow', () => {
  const action = runSpecKitWorkflowAction()
  const workspace = createMockDirectory()
  const tempDir = createMockDirectory()

  const createContext = (
    input: Record<string, unknown>,
    secrets?: Record<string, string>,
  ) => {
    const ctx = createMockActionContext({
      input: input as any,
      workspacePath: workspace.path,
      secrets,
    })
    ctx.createTemporaryDirectory = jest.fn().mockResolvedValue(tempDir.path)
    return ctx
  }

  // Simulates specify: writes run state into the workspace, then reports the
  // outcome after some agent output on stdout.
  const mockSpecify = (
    outcome: Record<string, unknown>,
    options: { exitCode?: number } = {},
  ) =>
    spawnMock.mockImplementation(() => {
      workspace.addContent({
        [`.specify/workflows/runs/${outcome.run_id}/state.json`]: '{}',
      })
      return fakeChild({
        stdout: [
          'Agent output\n{ not the outcome\n',
          `${JSON.stringify(outcome, null, 2)}\n`,
        ],
        exitCode: options.exitCode,
      })
    })

  beforeEach(() => {
    workspace.setContent({ '.specify': { 'init-options.json': '{}' } })
    tempDir.setContent({})
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('runs the workflow YAML from a temporary file and cleans up the run state', async () => {
    mockSpecify({ run_id: 'abc123', status: 'completed' })
    const ctx = createContext(
      {
        workflow: workflowYaml,
        inputs: { spec: 'Add bulk import', retries: 2, draft: true },
      },
      { USER_GITHUB_TOKEN: 'gh-user-token' },
    )

    await action.handler(ctx)

    const workflowPath = path.join(tempDir.path, 'workflow.yml')
    expect(spawnMock).toHaveBeenCalledWith(
      'specify',
      [
        'workflow',
        'run',
        workflowPath,
        '--input',
        'spec=Add bulk import',
        '--input',
        'retries=2',
        '--input',
        'draft=true',
        '--json',
      ],
      expect.objectContaining({
        cwd: workspace.path,
        env: expect.objectContaining({ GH_TOKEN: 'gh-user-token' }),
      }),
    )
    expect(fs.readFileSync(workflowPath, 'utf8')).toBe(workflowYaml)
    expect(fs.existsSync(workspace.resolve('workflow.yml'))).toBe(false)
    expect(
      fs.existsSync(workspace.resolve('.specify/workflows/runs/abc123')),
    ).toBe(false)
    expect(ctx.output).toHaveBeenCalledWith('runId', 'abc123')
    expect(ctx.output).toHaveBeenCalledWith('status', 'completed')
  })

  test('writes the command output to the step log line by line as it arrives', async () => {
    spawnMock.mockImplementation(() => {
      workspace.addContent({
        '.specify/workflows/runs/log001/state.json': JSON.stringify({
          step_results: {
            specify: { type: 'command', status: 'completed', output: {} },
            check: {
              type: 'shell',
              status: 'failed',
              error: 'Shell command exited with code 2.',
              output: { stdout: 'checked 3 files\n', stderr: 'oops\n' },
            },
          },
        }),
      })
      return fakeChild({
        stdout: [
          '\x1b[32mCreating spec',
          ' for photo album\x1b[0m\r\nWriting spec.md\n',
          '\n{\n  "run_id": "log001",\n  "status": "completed"\n}',
        ],
        stderr: ['Running step specify\n'],
      })
    })
    const ctx = createContext({ workflow: workflowYaml })
    const info = jest.spyOn(ctx.logger, 'info')

    await action.handler(ctx)

    const logged = info.mock.calls.map(([message]) => message)
    expect(logged).toEqual(
      expect.arrayContaining([
        'Creating spec for photo album',
        'Writing spec.md',
        'Running step specify',
        '  "run_id": "log001",',
        '}',
        'Step "specify" (command) completed',
        'Step "check" (shell) failed: Shell command exited with code 2.',
        '[check] checked 3 files',
        '[check] oops',
      ]),
    )
    expect(logged).not.toContain('')
    expect(ctx.output).toHaveBeenCalledWith('runId', 'log001')
  })

  test('uses the token secret the template names, or the host credentials by default', async () => {
    mockSpecify({ run_id: 'tok001', status: 'completed' })

    await action.handler(
      createContext(
        { workflow: workflowYaml, userCredentialsSecretKey: 'COPILOT_TOKEN' },
        { COPILOT_TOKEN: 'custom-token', USER_GITHUB_TOKEN: 'other-token' },
      ),
    )
    expect(spawnMock.mock.calls[0][2].env.GH_TOKEN).toBe('custom-token')
    expect(spawnMock.mock.calls[0][2].env.COPILOT_GITHUB_TOKEN).toBe(
      process.env.COPILOT_GITHUB_TOKEN,
    )

    await action.handler(createContext({ workflow: workflowYaml }))
    expect(spawnMock.mock.calls[1][2].env).toBe(process.env)

    spawnMock.mockClear()
    await expect(
      action.handler(
        createContext({
          workflow: workflowYaml,
          userCredentialsSecretKey: 'COPILOT_TOKEN',
        }),
      ),
    ).rejects.toThrow('Missing GitHub token secret "COPILOT_TOKEN"')
    expect(spawnMock).not.toHaveBeenCalled()
  })

  test('fails when a gate pauses the run and still cleans up the run state', async () => {
    mockSpecify({
      run_id: 'gate01',
      status: 'paused',
      current_step_id: 'review-spec',
      gate: { step_id: 'review-spec', message: 'Review the spec' },
    })

    await expect(
      action.handler(
        createContext({ workflow: workflowYaml }),
      ),
    ).rejects.toThrow(
      'did not complete: the workflow paused at gate step "review-spec" (Review the spec)',
    )
    expect(
      fs.existsSync(workspace.resolve('.specify/workflows/runs/gate01')),
    ).toBe(false)
  })

  test('reports failed runs, specify errors, and empty workflows', async () => {
    mockSpecify(
      {
        run_id: 'fail01',
        status: 'failed',
        current_step_id: 'plan',
        error: 'Command exited with code 1',
      },
      { exitCode: 1 },
    )
    const failedCtx = createContext({ workflow: workflowYaml })
    await expect(action.handler(failedCtx)).rejects.toThrow(
      'Spec Kit workflow run fail01 in',
    )
    await expect(action.handler(failedCtx)).rejects.toThrow(
      'the workflow finished with status "failed" at step "plan": Command exited with code 1',
    )
    expect(failedCtx.output).toHaveBeenCalledWith('status', 'failed')

    spawnMock.mockImplementation(() =>
      fakeChild({
        stderr: ["Error: Required input 'spec' not provided.\n"],
        exitCode: 1,
      }),
    )
    await expect(
      action.handler(createContext({ workflow: workflowYaml })),
    ).rejects.toThrow(
      'Failed to run the Spec Kit workflow in ' +
        `${workspace.path}: specify exited with exit code 1; stderr: Error: Required input 'spec' not provided.`,
    )

    spawnMock.mockImplementation(() =>
      fakeChild({
        error: Object.assign(new Error('spawn specify ENOENT'), {
          code: 'ENOENT',
        }),
      }),
    )
    await expect(
      action.handler(createContext({ workflow: workflowYaml })),
    ).rejects.toThrow(
      `Failed to run the Spec Kit workflow in ${workspace.path}: spawn specify ENOENT`,
    )

    spawnMock.mockReset()
    await expect(
      action.handler(createContext({ workflow: '  ' })),
    ).rejects.toThrow('A non-empty workflow is required to run Spec Kit')
    expect(spawnMock).not.toHaveBeenCalled()
  })

  test('reads the outcome after other output on stdout', () => {
    expect(
      parseWorkflowRunOutcome(
        'Copilot says hi\n{\n  "run_id": "x1",\n  "status": "completed"\n}\n',
      ),
    ).toEqual({ run_id: 'x1', status: 'completed' })
    expect(parseWorkflowRunOutcome('no json here')).toBeUndefined()
  })
})

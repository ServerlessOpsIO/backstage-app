import { execFile } from 'node:child_process'

import { initializeSpecKitAction } from './speckit-init'

jest.mock('node:child_process', () => ({
  execFile: jest.fn(),
}))

const execFileMock = execFile as unknown as jest.Mock

describe('github:copilot:speckit:init', () => {
  beforeEach(() => {
    execFileMock.mockImplementation(
      (
        _command: string,
        _args: string[],
        _options: { cwd: string },
        callback: (
          error: Error | null,
          stdout?: string,
          stderr?: string,
        ) => void,
      ) => callback(null),
    )
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test.each([
    [{}, ['--integration', 'copilot', '--integration-options=--skills']],
    [
      { integration: 'copilot', integrationOptions: 'commands' },
      ['--integration', 'copilot', '--integration-options=--commands'],
    ],
    [{ integration: 'claude' }, ['--integration', 'claude']],
    [
      { integration: 'codex', integrationOptions: 'skills' },
      ['--integration', 'codex'],
    ],
  ])(
    'runs specify from the generated project workspace (%j)',
    async (input, integrationArgs) => {
      const action = initializeSpecKitAction()
      const logger = { info: jest.fn() }

      await action.handler({
        input,
        workspacePath: '/tmp/generated-project',
        logger: logger as any,
      } as any)

      expect(execFileMock).toHaveBeenCalledWith(
        'specify',
        ['init', ...integrationArgs, '--non-interactive', '--force', '.'],
        { cwd: '/tmp/generated-project' },
        expect.any(Function),
      )
      expect(logger.info).toHaveBeenCalledWith(
        `Initialized Spec Kit with the ${integrationArgs[1]} integration in /tmp/generated-project`,
      )
    },
  )

  test.each([
    [
      { integration: 'gemini' },
      'Unsupported Spec Kit integration: gemini. Use one of: copilot, claude, codex.',
    ],
    [
      { integrationOptions: 'prompts' },
      'Unsupported Spec Kit integration options: prompts. Use one of: skills, commands.',
    ],
    [
      { integration: 'claude', integrationOptions: 'commands' },
      'The claude Spec Kit integration does not support commands. Use skills instead.',
    ],
  ])(
    'rejects unsupported inputs without running specify (%j)',
    async (input, message) => {
      const action = initializeSpecKitAction()

      await expect(
        action.handler({
          input,
          workspacePath: '/tmp/generated-project',
          logger: { info: jest.fn() } as any,
        } as any),
      ).rejects.toThrow(message)
      expect(execFileMock).not.toHaveBeenCalled()
    },
  )

  test('fails the scaffolder action when specify cannot start', async () => {
    const processError = new Error('spawn specify ENOENT')
    execFileMock.mockImplementationOnce(
      (
        _command: string,
        _args: string[],
        _options: { cwd: string },
        callback: (
          error: Error | null,
          stdout?: string,
          stderr?: string,
        ) => void,
      ) => callback(processError),
    )

    const action = initializeSpecKitAction()

    await expect(
      action.handler({
        input: {},
        workspacePath: '/tmp/generated-project',
        logger: { info: jest.fn() } as any,
      } as any),
    ).rejects.toThrow(
      'Failed to initialize Spec Kit in /tmp/generated-project: spawn specify ENOENT',
    )
  })

  test('fails the scaffolder action when specify exits unsuccessfully', async () => {
    const processError = Object.assign(
      new Error('Command failed: specify init --integration copilot --integration-options=--skills --non-interactive --force .'),
      // Like the real promisified execFile, the error carries the command's stderr.
      { code: 1, stderr: 'Spec Kit initialization failed' },
    )
    execFileMock.mockImplementationOnce(
      (
        _command: string,
        _args: string[],
        _options: { cwd: string },
        callback: (
          error: Error | null,
          stdout?: string,
          stderr?: string,
        ) => void,
      ) => callback(processError),
    )

    const action = initializeSpecKitAction()

    await expect(
      action.handler({
        input: {},
        workspacePath: '/tmp/generated-project',
        logger: { info: jest.fn() } as any,
      } as any),
    ).rejects.toThrow(
      'Failed to initialize Spec Kit in /tmp/generated-project: Command failed: specify init --integration copilot --integration-options=--skills --non-interactive --force .; stderr: Spec Kit initialization failed',
    )
  })
})

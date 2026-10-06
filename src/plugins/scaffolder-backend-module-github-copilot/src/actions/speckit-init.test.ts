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

  test('runs specify from the generated project workspace', async () => {
    const action = initializeSpecKitAction()
    const logger = { info: jest.fn() }

    await action.handler({
      input: {},
      workspacePath: '/tmp/generated-project',
      logger: logger as any,
    } as any)

    expect(execFileMock).toHaveBeenCalledWith(
      'specify',
      ['init', '--non-interactive', '--force', '.'],
      { cwd: '/tmp/generated-project' },
      expect.any(Function),
    )
    expect(logger.info).toHaveBeenCalledWith(
      'Initialized Spec Kit in /tmp/generated-project',
    )
  })

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
      new Error('Command failed: specify init --non-interactive --force .'),
      { code: 1 },
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
      ) => callback(processError, '', 'Spec Kit initialization failed'),
    )

    const action = initializeSpecKitAction()

    await expect(
      action.handler({
        input: {},
        workspacePath: '/tmp/generated-project',
        logger: { info: jest.fn() } as any,
      } as any),
    ).rejects.toThrow(
      'Failed to initialize Spec Kit in /tmp/generated-project: Command failed: specify init --non-interactive --force .; stderr: Spec Kit initialization failed',
    )
  })
})

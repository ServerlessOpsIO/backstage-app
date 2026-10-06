import { execFile } from 'node:child_process'
import { createTemplateAction } from '@backstage/plugin-scaffolder-node'

const SPECIFY_ARGS = ['init', '--non-interactive', '--force', '.']

export function initializeSpecKitAction() {
  return createTemplateAction({
    id: 'github:copilot:speckit:init',
    description: 'Initializes GitHub Spec Kit in the generated project',
    async handler(ctx) {
      await new Promise<void>((resolve, reject) => {
        execFile(
          'specify',
          SPECIFY_ARGS,
          { cwd: ctx.workspacePath },
          (error, _stdout, stderr) => {
            if (error) {
              const stderrMessage = stderr?.toString().trim()
              const details = stderrMessage
                ? `${error.message}; stderr: ${stderrMessage}`
                : error.message
              reject(
                new Error(
                  `Failed to initialize Spec Kit in ${ctx.workspacePath}: ${details}`,
                  { cause: error },
                ),
              )
              return
            }
            resolve()
          },
        )
      })

      ctx.logger.info(`Initialized Spec Kit in ${ctx.workspacePath}`)
    },
  })
}

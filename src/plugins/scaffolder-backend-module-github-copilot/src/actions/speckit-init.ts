import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createTemplateAction } from '@backstage/plugin-scaffolder-node'

const execFileAsync = promisify(execFile)

const SPECKIT_INTEGRATIONS = ['copilot', 'claude', 'codex'] as const

const SPECKIT_INTEGRATION_OPTIONS = ['skills', 'commands'] as const

type SpecKitIntegration = (typeof SPECKIT_INTEGRATIONS)[number]
type SpecKitIntegrationOption = (typeof SPECKIT_INTEGRATION_OPTIONS)[number]

function specifyArgs(
  integration: SpecKitIntegration,
  integrationOptions: SpecKitIntegrationOption,
): string[] {
  // Only the Copilot integration supports choosing between the skills and
  // commands layouts. execFile does not use a shell, so the option value is
  // passed without quotes.
  const optionArgs =
    integration === 'copilot'
      ? [`--integration-options=--${integrationOptions}`]
      : []
  return [
    'init',
    '--integration',
    integration,
    ...optionArgs,
    '--non-interactive',
    '--force',
    '.',
  ]
}

export function initializeSpecKitAction() {
  return createTemplateAction({
    id: 'github:copilot:speckit:init',
    description: 'Initializes GitHub Spec Kit in the generated project',
    schema: {
      input: {
        integration: z =>
          z
            .enum(SPECKIT_INTEGRATIONS, {
              description:
                'AI coding agent integration to set up Spec Kit for. Defaults to copilot.',
            })
            .optional(),
        integrationOptions: z =>
          z
            .enum(SPECKIT_INTEGRATION_OPTIONS, {
              description:
                'Whether Spec Kit installs its commands as skills or as commands. Only the copilot integration supports commands. Defaults to skills.',
            })
            .optional(),
      },
    },
    async handler(ctx) {
      const integration = ctx.input.integration ?? 'copilot'
      if (!SPECKIT_INTEGRATIONS.includes(integration)) {
        throw new Error(
          `Unsupported Spec Kit integration: ${String(
            integration,
          )}. Use one of: ${SPECKIT_INTEGRATIONS.join(', ')}.`,
        )
      }

      const integrationOptions = ctx.input.integrationOptions ?? 'skills'
      if (!SPECKIT_INTEGRATION_OPTIONS.includes(integrationOptions)) {
        throw new Error(
          `Unsupported Spec Kit integration options: ${String(
            integrationOptions,
          )}. Use one of: ${SPECKIT_INTEGRATION_OPTIONS.join(', ')}.`,
        )
      }
      if (integrationOptions === 'commands' && integration !== 'copilot') {
        throw new Error(
          `The ${integration} Spec Kit integration does not support commands. Use skills instead.`,
        )
      }

      try {
        await execFileAsync(
          'specify',
          specifyArgs(integration, integrationOptions),
          { cwd: ctx.workspacePath },
        )
      } catch (error: unknown) {
        // The promisified execFile rejects with an error that carries the
        // command's stderr.
        const { message, stderr } = error as Error & { stderr?: unknown }
        const stderrMessage = stderr?.toString().trim()
        const details = stderrMessage
          ? `${message}; stderr: ${stderrMessage}`
          : message
        throw new Error(
          `Failed to initialize Spec Kit in ${ctx.workspacePath}: ${details}`,
          { cause: error },
        )
      }

      ctx.logger.info(
        `Initialized Spec Kit with the ${integration} integration in ${ctx.workspacePath}`,
      )
    },
  })
}

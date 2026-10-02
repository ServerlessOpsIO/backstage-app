import { coreServices, createBackendModule } from '@backstage/backend-plugin-api'
import {
  DefaultGithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration'
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node'

import { launchGithubCopilotAgentAction } from './actions'

export const scaffolderModuleGithubCopilot = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'github-copilot',
  register({ registerInit }) {
    registerInit({
      deps: {
        scaffolderActions: scaffolderActionsExtensionPoint,
        rootConfig: coreServices.rootConfig,
      },
      async init({ scaffolderActions, rootConfig }) {
        const integrations = ScmIntegrations.fromConfig(rootConfig)
        const githubCredentialsProvider =
          DefaultGithubCredentialsProvider.fromIntegrations(integrations)

        scaffolderActions.addActions(
          launchGithubCopilotAgentAction(githubCredentialsProvider),
        )
      },
    })
  },
})


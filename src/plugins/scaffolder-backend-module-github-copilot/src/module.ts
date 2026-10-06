import { createBackendModule } from '@backstage/backend-plugin-api'
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node'

import {
  initializeSpecKitAction,
  launchGithubCopilotAgentAction,
} from './actions'

export const scaffolderModuleGithubCopilot = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'github-copilot',
  register({ registerInit }) {
    registerInit({
      deps: {
        scaffolderActions: scaffolderActionsExtensionPoint,
      },
      async init({ scaffolderActions }) {
        scaffolderActions.addActions(
          launchGithubCopilotAgentAction(),
          initializeSpecKitAction(),
        )
      },
    })
  },
})

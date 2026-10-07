import { createBackendModule } from '@backstage/backend-plugin-api'
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node'

import {
  createSpecKitAnalyzeAction,
  createSpecKitChecklistAction,
  createSpecKitClarifyAction,
  createSpecKitConstitutionAction,
  createSpecKitConvergeAction,
  createSpecKitImplementAction,
  createSpecKitPlanAction,
  createSpecKitSpecifyAction,
  createSpecKitTasksAction,
  createSpecKitTasksToIssuesAction,
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
          createSpecKitConstitutionAction(),
          createSpecKitPlanAction(),
          createSpecKitSpecifyAction(),
          createSpecKitTasksAction(),
          createSpecKitTasksToIssuesAction(),
          createSpecKitAnalyzeAction(),
          createSpecKitChecklistAction(),
          createSpecKitClarifyAction(),
          createSpecKitConvergeAction(),
          createSpecKitImplementAction(),
        )
      },
    })
  },
})

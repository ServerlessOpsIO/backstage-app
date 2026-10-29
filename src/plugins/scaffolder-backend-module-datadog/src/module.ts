import { coreServices, createBackendModule } from '@backstage/backend-plugin-api'
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node'

import { createDatadogAlarmAction, createDatadogDashboardAction } from './actions'

export const scaffolderModuleDatadog = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'datadog',
  register({ registerInit }) {
    registerInit({
      deps: {
        scaffolderActions: scaffolderActionsExtensionPoint,
        rootConfig: coreServices.rootConfig,
      },
      async init({ scaffolderActions, rootConfig }) {
        scaffolderActions.addActions(
          createDatadogAlarmAction({ config: rootConfig }),
          createDatadogDashboardAction({ config: rootConfig }),
        )
      },
    })
  },
})

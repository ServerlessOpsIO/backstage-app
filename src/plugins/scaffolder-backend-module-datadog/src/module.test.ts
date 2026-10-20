jest.mock('@backstage/backend-plugin-api', () => ({
  coreServices: {
    rootConfig: { id: 'rootConfig' },
  },
  createBackendModule: jest.fn(options => options),
}))

jest.mock('@backstage/plugin-scaffolder-node', () => ({
  scaffolderActionsExtensionPoint: { id: 'scaffolderActions' },
}))

jest.mock('./actions', () => ({
  createDatadogAlarmAction: jest.fn(),
  createDatadogDashboardAction: jest.fn(),
}))

import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api'
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node'
import { createDatadogAlarmAction, createDatadogDashboardAction } from './actions'
import { scaffolderModuleDatadog } from './module'

describe('scaffolderModuleDatadog', () => {
  test('registers Datadog actions with scaffolder extension point', async () => {
    expect(createBackendModule).toHaveBeenCalledWith(
      expect.objectContaining({
        pluginId: 'scaffolder',
        moduleId: 'datadog',
      }),
    )

    const alarmAction = { id: 'x_datadog:alarm:create' }
    const dashboardAction = { id: 'x_datadog:dashboard:create' }
    ;(createDatadogAlarmAction as jest.Mock).mockReturnValue(alarmAction)
    ;(createDatadogDashboardAction as jest.Mock).mockReturnValue(
      dashboardAction,
    )

    const moduleDefinition = scaffolderModuleDatadog as any
    const registerInit = jest.fn()
    moduleDefinition.register({ registerInit })

    expect(registerInit).toHaveBeenCalledWith(
      expect.objectContaining({
        deps: {
          scaffolderActions: scaffolderActionsExtensionPoint,
          rootConfig: coreServices.rootConfig,
        },
      }),
    )

    const initRegistration = registerInit.mock.calls[0][0]
    const addActions = jest.fn()
    const rootConfig = { getOptionalString: jest.fn() }

    await initRegistration.init({
      scaffolderActions: { addActions },
      rootConfig,
    })

    expect(createDatadogAlarmAction).toHaveBeenCalledWith({ config: rootConfig })
    expect(createDatadogDashboardAction).toHaveBeenCalledWith({
      config: rootConfig,
    })
    expect(addActions).toHaveBeenCalledWith(alarmAction, dashboardAction)
  })
})

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
}))

import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api'
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node'
import { createDatadogAlarmAction } from './actions'
import { scaffolderModuleDatadog } from './module'

describe('scaffolderModuleDatadog', () => {
  test('registers the Datadog alarm action with scaffolder extension point', async () => {
    expect(createBackendModule).toHaveBeenCalledWith(
      expect.objectContaining({
        pluginId: 'scaffolder',
        moduleId: 'datadog',
      }),
    )

    const action = { id: 'x_datadog:alarm:create' }
    ;(createDatadogAlarmAction as jest.Mock).mockReturnValue(action)

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
    expect(addActions).toHaveBeenCalledWith(action)
  })
})

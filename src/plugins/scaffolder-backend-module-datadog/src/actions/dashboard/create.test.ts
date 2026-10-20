import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { createDatadogDashboardAction } from './create'

function createConfig() {
  const values: Record<string, string> = {
    'scaffolder.datadog.apiKey': 'dd-api-key',
    'scaffolder.datadog.appKey': 'dd-app-key',
    'scaffolder.datadog.site': 'datadoghq.com',
  }
  return {
    getOptionalString(path: string) {
      return values[path]
    },
  } as any
}

describe('x_datadog:dashboard:create (scaffold)', () => {
  test('exposes the dashboard action id and fails as not implemented', async () => {
    const action = createDatadogDashboardAction({ config: createConfig() })
    const ctx = createMockActionContext({
      input: {
        projectKey: 'payments-service',
        dashboards: [
          {
            name: 'Service overview',
            baselineId: 'service-overview-v1',
          },
        ],
      } as any,
    })

    expect(action.id).toBe('x_datadog:dashboard:create')
    await expect(action.handler(ctx)).rejects.toThrow(
      'Datadog dashboard baseline provisioning has not been implemented yet',
    )
  })
})

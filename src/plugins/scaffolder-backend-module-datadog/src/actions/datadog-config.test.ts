import { getDatadogAccountConfig } from './datadog-config'

describe('getDatadogAccountConfig', () => {
  const values = {
    'integrations.datadog.authMethods.apiKeyAuth': 'dd-api-key',
    'integrations.datadog.authMethods.appKeyAuth': 'dd-app-key',
    'integrations.datadog.server': 'datadoghq.com',
  }

  function createConfig(overrides: Record<string, string | undefined> = {}) {
    const configValues = { ...values, ...overrides }
    return {
      getOptionalString(path: string) {
        return configValues[path]
      },
    } as any
  }

  it('reads the shared integration credentials and site', () => {
    expect(getDatadogAccountConfig(createConfig())).toEqual({
      apiKey: 'dd-api-key',
      appKey: 'dd-app-key',
      site: 'datadoghq.com',
    })
  })

  it('reports all missing integration settings', () => {
    expect(() =>
      getDatadogAccountConfig(
        createConfig({
          'integrations.datadog.authMethods.apiKeyAuth': undefined,
          'integrations.datadog.authMethods.appKeyAuth': undefined,
          'integrations.datadog.server': undefined,
        }),
      ),
    ).toThrow(
      'Missing required Datadog configuration key(s): integrations.datadog.authMethods.apiKeyAuth, integrations.datadog.authMethods.appKeyAuth, integrations.datadog.server',
    )
  })
})

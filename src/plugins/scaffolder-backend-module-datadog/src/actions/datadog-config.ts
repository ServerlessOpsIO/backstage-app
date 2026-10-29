import { Config } from '@backstage/config'
import { client } from '@datadog/datadog-api-client'

const DATADOG_CONFIG_PATH = 'integrations.datadog'

export type DatadogAccountConfig = {
  apiKey: string
  appKey: string
  site: string
}

export function getDatadogAccountConfig(config: Config): DatadogAccountConfig {
  const apiKey = config.getOptionalString(
    `${DATADOG_CONFIG_PATH}.authMethods.apiKeyAuth`,
  )
  const appKey = config.getOptionalString(
    `${DATADOG_CONFIG_PATH}.authMethods.appKeyAuth`,
  )
  const site = config.getOptionalString(`${DATADOG_CONFIG_PATH}.server`)

  const missingKeys: string[] = []
  if (!apiKey) {
    missingKeys.push(`${DATADOG_CONFIG_PATH}.authMethods.apiKeyAuth`)
  }
  if (!appKey) {
    missingKeys.push(`${DATADOG_CONFIG_PATH}.authMethods.appKeyAuth`)
  }
  if (!site) {
    missingKeys.push(`${DATADOG_CONFIG_PATH}.server`)
  }

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required Datadog configuration key(s): ${missingKeys.join(', ')}`,
    )
  }

  return {
    apiKey: apiKey as string,
    appKey: appKey as string,
    site: site as string,
  }
}

export function createDatadogClientConfiguration(
  accountConfig: DatadogAccountConfig,
) {
  const configuration = client.createConfiguration({
    authMethods: {
      apiKeyAuth: accountConfig.apiKey,
      appKeyAuth: accountConfig.appKey,
    },
  })
  configuration.setServerVariables({ site: accountConfig.site })
  return configuration
}

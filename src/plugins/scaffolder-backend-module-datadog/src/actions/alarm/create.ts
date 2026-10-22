import { Config } from '@backstage/config'
import { createHash } from 'node:crypto'
import { createTemplateAction } from '@backstage/plugin-scaffolder-node'
import { client, v1 } from '@datadog/datadog-api-client'

const DATADOG_CONFIG_PATH = 'scaffolder.datadog'
const IDENTITY_TAG_KEY = 'serverlessops_scaffolder_identity'
const SUPPORTED_METRIC_MONITOR_TYPES = new Set(['query alert', 'metric alert'])

type DatadogAccountConfig = {
  apiKey: string
  appKey: string
  site: string
}

type DatadogMonitorDefinition = {
  name: string
  type: string
  query: string
  message: string
  tags?: string[]
  options?: Record<string, unknown>
  priority?: number
}

type DatadogAlarmCreateRequest = {
  projectIdentity: string
  monitors: DatadogMonitorDefinition[]
}

type AlarmProvisioningResult = {
  index: number
  name: string
  status: 'created' | 'updated' | 'failed'
  monitorId?: string
  monitorUrl?: string
  error?: string
}

function toErrorMessage(error: unknown): string {
  if (error instanceof client.ApiException) {
    return `Datadog API request failed (${error.code}): ${extractDatadogError(error.body)}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

function extractDatadogError(responseBody: unknown): string {
  if (typeof responseBody === 'string' && responseBody.trim().length > 0) {
    return responseBody
  }
  if (typeof responseBody !== 'object' || responseBody === null) {
    return 'Unknown Datadog API error'
  }

  const body = responseBody as {
    errors?: unknown
    error?: unknown
    message?: unknown
  }
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return body.errors
      .map(item => (typeof item === 'string' ? item : JSON.stringify(item)))
      .join('; ')
  }
  if (typeof body.error === 'string') {
    return body.error
  }
  if (typeof body.message === 'string') {
    return body.message
  }

  return JSON.stringify(body)
}

function normalizeTagPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function buildIdentityTag(projectIdentity: string, monitorName: string): string {
  const normalizedIdentity = normalizeTagPart(projectIdentity)
  const normalizedName = normalizeTagPart(monitorName)
  const digest = createHash('sha256')
    .update(`${normalizedIdentity}:${normalizedName}`)
    .digest('hex')
  return `${IDENTITY_TAG_KEY}:${digest}`
}

function buildMonitorUrl(site: string, monitorId: number): string {
  return `https://app.${site}/monitors/${monitorId}`
}

function getDatadogAccountConfig(config: Config): DatadogAccountConfig {
  const apiKey = config.getOptionalString(`${DATADOG_CONFIG_PATH}.apiKey`)
  const appKey = config.getOptionalString(`${DATADOG_CONFIG_PATH}.appKey`)
  const site = config.getOptionalString(`${DATADOG_CONFIG_PATH}.site`)

  const missingKeys: string[] = []
  if (!apiKey) {
    missingKeys.push(`${DATADOG_CONFIG_PATH}.apiKey`)
  }
  if (!appKey) {
    missingKeys.push(`${DATADOG_CONFIG_PATH}.appKey`)
  }
  if (!site) {
    missingKeys.push(`${DATADOG_CONFIG_PATH}.site`)
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

function getMonitorValidationErrors(
  monitor: DatadogMonitorDefinition,
  index: number,
): string[] {
  const errors: string[] = []

  if (!monitor.name || monitor.name.trim().length === 0) {
    errors.push(`monitors[${index}].name must be a non-empty string`)
  }
  if (!monitor.type || monitor.type.trim().length === 0) {
    errors.push(`monitors[${index}].type must be a non-empty metric monitor type`)
  } else if (
    !SUPPORTED_METRIC_MONITOR_TYPES.has(monitor.type.trim().toLowerCase())
  ) {
    errors.push(
      `monitors[${index}].type must be one of: ${Array.from(SUPPORTED_METRIC_MONITOR_TYPES).join(', ')}`,
    )
  }
  if (!monitor.query || monitor.query.trim().length === 0) {
    errors.push(`monitors[${index}].query must be a non-empty Datadog query`)
  }
  if (!monitor.message || monitor.message.trim().length === 0) {
    errors.push(
      `monitors[${index}].message must be a non-empty string with notification destinations`,
    )
  } else if (!/@\S+/.test(monitor.message)) {
    errors.push(
      `monitors[${index}].message must include at least one notification destination (for example @slack-alerts)`,
    )
  }

  return errors
}

function validateTopLevelRequest(input: DatadogAlarmCreateRequest): void {
  if (!input.projectIdentity || input.projectIdentity.trim().length === 0) {
    throw new Error('projectIdentity must be a non-empty string')
  }
  if (!Array.isArray(input.monitors) || input.monitors.length === 0) {
    throw new Error('monitors must contain at least one monitor definition')
  }

  const duplicateNames = new Set<string>()
  const seenNames = new Set<string>()
  for (const monitor of input.monitors) {
    const normalizedName = monitor.name.trim().toLowerCase()
    if (!normalizedName) {
      continue
    }
    if (seenNames.has(normalizedName)) {
      duplicateNames.add(monitor.name.trim())
    }
    seenNames.add(normalizedName)
  }

  if (duplicateNames.size > 0) {
    throw new Error(
      `Duplicate monitor names are not allowed in one request: ${Array.from(duplicateNames).join(', ')}`,
    )
  }
}

function buildMonitorPayload(
  monitor: DatadogMonitorDefinition,
  identityTag: string,
): v1.Monitor {
  const tags = new Set<string>([identityTag])
  for (const tag of monitor.tags ?? []) {
    if (typeof tag === 'string' && tag.trim().length > 0) {
      tags.add(tag.trim())
    }
  }

  const payload: v1.Monitor = {
    name: monitor.name.trim(),
    type: monitor.type.trim().toLowerCase() as v1.MonitorType,
    query: monitor.query.trim(),
    message: monitor.message.trim(),
    tags: Array.from(tags),
  }

  if (monitor.options) {
    // Template inputs use the Datadog API's snake_case option names, so convert
    // them into the client's model before it serializes the request.
    payload.options = v1.ObjectSerializer.deserialize(
      monitor.options,
      'MonitorOptions',
    ) as v1.MonitorOptions
  }
  if (typeof monitor.priority === 'number') {
    payload.priority = monitor.priority
  }

  return payload
}

function createDatadogMonitorsApi(
  accountConfig: DatadogAccountConfig,
): v1.MonitorsApi {
  const configuration = client.createConfiguration({
    authMethods: {
      apiKeyAuth: accountConfig.apiKey,
      appKeyAuth: accountConfig.appKey,
    },
  })
  configuration.setServerVariables({ site: accountConfig.site })
  return new v1.MonitorsApi(configuration)
}

export function createDatadogAlarmAction(options: { config: Config }) {
  return createTemplateAction({
    id: 'x_datadog:alarm:create',
    description:
      'Creates or updates Datadog metric monitors from scaffolder template inputs',
    schema: {
      input: z =>
        z.object({
          projectIdentity: z.string({
            description:
              'Stable project identity used with the monitor name for idempotent retries',
          }),
          monitors: z
            .array(
              z.object({
                name: z.string({ description: 'Datadog monitor name' }),
                type: z.string({
                  description:
                    'Datadog monitor type. Must represent a supported metric monitor type.',
                }),
                query: z.string({
                  description: 'Datadog monitor query expression',
                }),
                message: z.string({
                  description: 'Datadog monitor message with notification destinations',
                }),
                tags: z
                  .array(z.string({ description: 'Optional Datadog monitor tag' }))
                  .optional(),
                options: z.record(z.string(), z.unknown()).optional(),
                priority: z.number().optional(),
              }),
            )
            .min(1),
        }),
      output: z =>
        z.object({
          results: z.array(
            z.object({
              index: z.number(),
              name: z.string(),
              status: z.enum(['created', 'updated', 'failed']),
              monitorId: z.string().optional(),
              monitorUrl: z.string().optional(),
              error: z.string().optional(),
            }),
          ),
        }),
    },
    async handler(ctx) {
      const input = ctx.input as DatadogAlarmCreateRequest
      validateTopLevelRequest(input)

      const accountConfig = getDatadogAccountConfig(options.config)
      const monitorsApi = createDatadogMonitorsApi(accountConfig)
      const results: AlarmProvisioningResult[] = []

      for (const [index, monitor] of input.monitors.entries()) {
        const monitorName = monitor.name?.trim() || `monitor-${index}`
        const validationErrors = getMonitorValidationErrors(monitor, index)
        if (validationErrors.length > 0) {
          results.push({
            index,
            name: monitorName,
            status: 'failed',
            error: validationErrors.join('; '),
          })
          continue
        }

        const identityTag = buildIdentityTag(input.projectIdentity, monitor.name)
        const payload = buildMonitorPayload(monitor, identityTag)

        try {
          const existingMonitors = await monitorsApi.listMonitors({
            monitorTags: identityTag,
          })

          if (existingMonitors.length > 1) {
            throw new Error(
              `Found multiple Datadog monitors for identity tag ${identityTag}; manual cleanup is required before retry`,
            )
          }

          const existingMonitor = existingMonitors[0]
          const status: 'created' | 'updated' =
            typeof existingMonitor === 'undefined' ? 'created' : 'updated'
          let response: v1.Monitor
          if (typeof existingMonitor === 'undefined') {
            response = await monitorsApi.createMonitor({ body: payload })
          } else {
            if (typeof existingMonitor.id !== 'number') {
              throw new Error(
                `Existing monitor for identity tag ${identityTag} is missing a valid numeric id`,
              )
            }
            response = await monitorsApi.updateMonitor({
              monitorId: existingMonitor.id,
              body: payload,
            })
          }

          const monitorId = response.id
          if (typeof monitorId !== 'number') {
            throw new Error(
              'Datadog API response did not include a numeric monitor identifier',
            )
          }

          results.push({
            index,
            name: monitorName,
            status,
            monitorId: String(monitorId),
            monitorUrl: buildMonitorUrl(accountConfig.site, monitorId),
          })
        } catch (error: unknown) {
          results.push({
            index,
            name: monitorName,
            status: 'failed',
            error: toErrorMessage(error),
          })
        }
      }

      ctx.output('results', results)

      const failedResults = results.filter(result => result.status === 'failed')
      if (failedResults.length > 0) {
        const failureDetails = failedResults
          .map(result => `[${result.index}] ${result.name}: ${result.error}`)
          .join('; ')
        throw new Error(
          `Failed to provision ${failedResults.length} of ${results.length} Datadog monitor(s): ${failureDetails}`,
        )
      }
    },
  })
}

import { Config } from '@backstage/config'
import { createHash } from 'node:crypto'
import { createTemplateAction } from '@backstage/plugin-scaffolder-node'

import { resolveDashboardBaseline } from './baselines'

const DATADOG_CONFIG_PATH = 'scaffolder.datadog'
const DASHBOARD_IDENTITY_TAG_KEY = 'serverlessops_scaffolder_dashboard_identity'
const DASHBOARD_PROJECT_KEY_TAG_KEY = 'serverlessops_scaffolder_project_key'
const DASHBOARD_MANAGED_TAG_KEY = 'serverlessops_scaffolder_managed'
const DASHBOARD_MANAGED_TAG_VALUE = 'true'

export type DashboardSelection = {
  name: string
  baselineId: string
  description?: string
  tags?: string[]
  templateVariables?: Record<string, string>
}

export type DatadogDashboardCreateRequest = {
  projectKey: string
  dashboards: DashboardSelection[]
}

export type DashboardProvisioningResult = {
  index: number
  name: string
  baselineId: string
  status: 'created' | 'updated' | 'failed'
  dashboardId?: string
  dashboardUrl?: string
  error?: string
}

type DatadogAccountConfig = {
  apiKey: string
  appKey: string
  site: string
}

type DatadogDashboardSummary = {
  id?: string
  title?: string
  url?: string
}

type DatadogDashboardResponse = {
  id?: string
  title?: string
  description?: string
  layout_type?: string
  url?: string
  tags?: string[]
  widgets?: unknown[]
}

type DatadogDashboardPayload = {
  title: string
  description?: string
  layout_type: string
  widgets: unknown[]
  tags: string[]
}

type DatadogDashboardApiClient = {
  listDashboards: () => Promise<DatadogDashboardSummary[]>
  getDashboard: (dashboardId: string) => Promise<DatadogDashboardResponse>
  createDashboard: (
    payload: DatadogDashboardPayload,
  ) => Promise<DatadogDashboardResponse>
  updateDashboard: (
    dashboardId: string,
    payload: DatadogDashboardPayload,
  ) => Promise<DatadogDashboardResponse>
}

function normalizeTagPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function buildDashboardIdentityTag(projectKey: string, dashboardName: string): string {
  const normalizedProjectKey = normalizeTagPart(projectKey)
  const normalizedName = normalizeTagPart(dashboardName)
  const digest = createHash('sha256')
    .update(`${normalizedProjectKey}:${normalizedName}`)
    .digest('hex')
  return `${DASHBOARD_IDENTITY_TAG_KEY}:${digest}`
}

function buildProjectKeyTag(projectKey: string): string {
  return `${DASHBOARD_PROJECT_KEY_TAG_KEY}:${normalizeTagPart(projectKey)}`
}

function buildManagedTag(): string {
  return `${DASHBOARD_MANAGED_TAG_KEY}:${DASHBOARD_MANAGED_TAG_VALUE}`
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

function extractDatadogError(responseBody: unknown): string {
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

function createDatadogDashboardApiClient(
  accountConfig: DatadogAccountConfig,
): DatadogDashboardApiClient {
  const baseUrl = `https://api.${accountConfig.site}`
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'DD-API-KEY': accountConfig.apiKey,
    'DD-APPLICATION-KEY': accountConfig.appKey,
  }

  async function request<T>(
    path: string,
    init: RequestInit,
    expectedKind: string,
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...init.headers,
      },
    })

    const rawBody = await response.text()
    let parsedBody: unknown
    if (rawBody.trim().length > 0) {
      try {
        parsedBody = JSON.parse(rawBody)
      } catch {
        parsedBody = rawBody
      }
    }

    if (!response.ok) {
      const detail = extractDatadogError(parsedBody)
      throw new Error(
        `Datadog API ${init.method ?? 'GET'} ${path} failed (${response.status}): ${detail}`,
      )
    }

    if (typeof parsedBody === 'undefined') {
      throw new Error(
        `Datadog API ${init.method ?? 'GET'} ${path} returned an empty ${expectedKind} response`,
      )
    }

    return parsedBody as T
  }

  return {
    async listDashboards() {
      const responseBody = await request<unknown>(
        '/api/v1/dashboard',
        { method: 'GET' },
        'dashboard list',
      )
      if (
        typeof responseBody !== 'object' ||
        responseBody === null ||
        !Array.isArray((responseBody as { dashboards?: unknown }).dashboards)
      ) {
        throw new Error(
          'Datadog API returned a non-array dashboard list while searching by dashboard name',
        )
      }

      return (responseBody as { dashboards: DatadogDashboardSummary[] }).dashboards
    },
    async getDashboard(dashboardId: string) {
      return request<DatadogDashboardResponse>(
        `/api/v1/dashboard/${encodeURIComponent(dashboardId)}`,
        { method: 'GET' },
        'dashboard',
      )
    },
    async createDashboard(payload: DatadogDashboardPayload) {
      return request<DatadogDashboardResponse>(
        '/api/v1/dashboard',
        { method: 'POST', body: JSON.stringify(payload) },
        'dashboard',
      )
    },
    async updateDashboard(
      dashboardId: string,
      payload: DatadogDashboardPayload,
    ) {
      return request<DatadogDashboardResponse>(
        `/api/v1/dashboard/${encodeURIComponent(dashboardId)}`,
        { method: 'PUT', body: JSON.stringify(payload) },
        'dashboard',
      )
    },
  }
}

function validateTopLevelRequest(input: DatadogDashboardCreateRequest): void {
  if (!input.projectKey || input.projectKey.trim().length === 0) {
    throw new Error('projectKey must be a non-empty stable project key')
  }
  if (!Array.isArray(input.dashboards) || input.dashboards.length === 0) {
    throw new Error('dashboards must contain at least one dashboard definition')
  }
}

function getSelectionValidationErrors(
  selection: DashboardSelection,
  index: number,
): string[] {
  const errors: string[] = []

  if (!selection.name || selection.name.trim().length === 0) {
    errors.push(`dashboards[${index}].name must be a non-empty dashboard display name`)
  }
  if (!selection.baselineId || selection.baselineId.trim().length === 0) {
    errors.push(
      `dashboards[${index}].baselineId must be a non-empty baseline identifier`,
    )
  }
  if (
    typeof selection.description === 'string' &&
    selection.description.trim().length === 0
  ) {
    errors.push(
      `dashboards[${index}].description must be a non-empty string when provided`,
    )
  }

  return errors
}

function buildDashboardPayload(
  projectKey: string,
  selection: DashboardSelection,
): DatadogDashboardPayload {
  const baseline = resolveDashboardBaseline(
    selection.baselineId,
    selection.templateVariables,
  )
  const identityTag = buildDashboardIdentityTag(projectKey, selection.name)
  const projectKeyTag = buildProjectKeyTag(projectKey)
  const managedTag = buildManagedTag()

  const tags = new Set<string>([identityTag, projectKeyTag, managedTag])
  for (const tag of baseline.tags ?? []) {
    if (tag.trim().length > 0) {
      tags.add(tag.trim())
    }
  }
  for (const tag of selection.tags ?? []) {
    if (tag.trim().length > 0) {
      tags.add(tag.trim())
    }
  }

  return {
    title: selection.name.trim(),
    description:
      typeof selection.description === 'string' &&
      selection.description.trim().length > 0
        ? selection.description.trim()
        : baseline.descriptionTemplate,
    layout_type: baseline.layoutType,
    widgets: baseline.widgets,
    tags: Array.from(tags),
  }
}

export function createDatadogDashboardAction(options: { config: Config }) {
  return createTemplateAction({
    id: 'x_datadog:dashboard:create',
    description:
      'Creates or updates Datadog dashboard baselines from scaffolder template inputs',
    schema: {
      input: z =>
        z.object({
          projectKey: z.string({
            description:
              'Non-empty stable project key used with dashboard name for idempotent retries',
          }),
          dashboards: z
            .array(
              z.object({
                name: z.string({
                  description: 'Non-empty dashboard display name',
                }),
                baselineId: z.string({
                  description: 'Reusable baseline identifier to provision',
                }),
                description: z
                  .string({
                    description: 'Optional dashboard description override',
                  })
                  .optional(),
                tags: z
                  .array(z.string({ description: 'Optional Datadog dashboard tag' }))
                  .optional(),
                templateVariables: z
                  .record(
                    z.string(),
                    z.string({
                      description:
                        'Template variable substitution value for baseline content',
                    }),
                  )
                  .optional(),
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
              baselineId: z.string(),
              status: z.enum(['created', 'updated', 'failed']),
              dashboardId: z.string().optional(),
              dashboardUrl: z.string().optional(),
              error: z.string().optional(),
            }),
          ),
        }),
    },
    async handler(ctx) {
      void options.config
      const input = ctx.input as DatadogDashboardCreateRequest
      validateTopLevelRequest(input)

      getDatadogAccountConfig(options.config)
      createDatadogDashboardApiClient(getDatadogAccountConfig(options.config))
      const results: DashboardProvisioningResult[] = []

      for (const [index, dashboard] of input.dashboards.entries()) {
        const dashboardName = dashboard.name?.trim() || `dashboard-${index}`
        const validationErrors = getSelectionValidationErrors(dashboard, index)
        if (validationErrors.length > 0) {
          results.push({
            index,
            name: dashboardName,
            baselineId: dashboard.baselineId?.trim() || 'unknown-baseline',
            status: 'failed',
            error: validationErrors.join('; '),
          })
          continue
        }

        try {
          buildDashboardPayload(input.projectKey, dashboard)
          results.push({
            index,
            name: dashboardName,
            baselineId: dashboard.baselineId.trim(),
            status: 'failed',
            error:
              'Datadog dashboard baseline provisioning is scaffolded but not fully implemented yet',
          })
        } catch (error: unknown) {
          results.push({
            index,
            name: dashboardName,
            baselineId: dashboard.baselineId.trim(),
            status: 'failed',
            error: toErrorMessage(error),
          })
        }
      }

      ctx.output('results', results)
      throw new Error(
        'Datadog dashboard baseline provisioning has not been implemented yet',
      )
    },
  })
}

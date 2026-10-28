import { v1 } from '@datadog/datadog-api-client'
import { createHash } from 'node:crypto'
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { createDatadogDashboardAction } from './create'

type TestConfig = {
  [key: string]: string | undefined
}

function createConfig(values: TestConfig = {}) {
  const defaults: TestConfig = {
    'integrations.datadog.authMethods.apiKeyAuth': 'dd-api-key',
    'integrations.datadog.authMethods.appKeyAuth': 'dd-app-key',
    'integrations.datadog.server': 'datadoghq.com',
  }
  const merged = { ...defaults, ...values }
  return {
    getOptionalString(path: string) {
      return merged[path]
    },
  } as any
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
  return `serverlessops_scaffolder_dashboard_identity:${digest}`
}

function buildProjectKeyTag(projectKey: string): string {
  return `serverlessops_scaffolder_project_key:${normalizeTagPart(projectKey)}`
}

function createDashboard(
  values: Partial<v1.Dashboard> = {},
): v1.Dashboard {
  return {
    id: 'abc123',
    title: 'Payments Service Overview',
    layoutType: 'ordered',
    widgets: [],
    url: '/dashboard/abc123',
    ...values,
  } as v1.Dashboard
}

describe('x_datadog:dashboard:create', () => {
  let listDashboards: jest.SpyInstance
  let getDashboard: jest.SpyInstance
  let createDashboardApi: jest.SpyInstance
  let updateDashboard: jest.SpyInstance

  beforeEach(() => {
    listDashboards = jest.spyOn(v1.DashboardsApi.prototype, 'listDashboards')
    getDashboard = jest.spyOn(v1.DashboardsApi.prototype, 'getDashboard')
    createDashboardApi = jest.spyOn(v1.DashboardsApi.prototype, 'createDashboard')
    updateDashboard = jest.spyOn(v1.DashboardsApi.prototype, 'updateDashboard')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('creates a dashboard from a baseline and emits created output', async () => {
    listDashboards.mockResolvedValue({ dashboards: [] })
    createDashboardApi.mockResolvedValue(createDashboard())

    const action = createDatadogDashboardAction({ config: createConfig() })
    const ctx = createMockActionContext({
      input: {
        projectKey: 'payments-service',
        dashboards: [
          {
            name: 'Payments Service Overview',
            baselineId: 'service-overview-v1',
            templateVariables: {
              service: 'payments',
              environment: 'prod',
            },
          },
        ],
      } as any,
    })

    await action.handler(ctx)

    expect(listDashboards).toHaveBeenCalledTimes(1)
    expect(createDashboardApi).toHaveBeenCalledTimes(1)
    const createPayload = createDashboardApi.mock.calls[0][0].body
    expect(createPayload.title).toBe('Payments Service Overview')
    expect(createPayload.tags).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^serverlessops_scaffolder_dashboard_identity:/),
        'serverlessops_scaffolder_project_key:payments-service',
        'serverlessops_scaffolder_managed:true',
        'baseline:service-overview-v1',
      ]),
    )

    expect(ctx.output).toHaveBeenCalledWith('results', [
      {
        index: 0,
        name: 'Payments Service Overview',
        baselineId: 'service-overview-v1',
        status: 'created',
        dashboardId: 'abc123',
        dashboardUrl: 'https://app.datadoghq.com/dashboard/abc123',
      },
    ])
  })

  test('updates an existing managed dashboard instead of creating a duplicate on retry', async () => {
    const projectKey = 'payments-service'
    const dashboardName = 'Payments Service Overview'
    const identityTag = buildDashboardIdentityTag(projectKey, dashboardName)
    const projectKeyTag = buildProjectKeyTag(projectKey)

    listDashboards
      .mockResolvedValueOnce({ dashboards: [] })
      .mockResolvedValueOnce({
        dashboards: [{ id: 'abc123', title: dashboardName }],
      })
    createDashboardApi.mockResolvedValue(createDashboard())
    getDashboard.mockResolvedValue(
      createDashboard({
        tags: [
          identityTag,
          projectKeyTag,
          'serverlessops_scaffolder_managed:true',
        ],
      }),
    )
    updateDashboard.mockResolvedValue(createDashboard())

    const action = createDatadogDashboardAction({ config: createConfig() })
    const firstCtx = createMockActionContext({
      input: {
        projectKey,
        dashboards: [
          {
            name: dashboardName,
            baselineId: 'service-overview-v1',
            templateVariables: {
              service: 'payments',
              environment: 'prod',
            },
          },
        ],
      } as any,
    })

    const secondCtx = createMockActionContext({
      input: {
        projectKey,
        dashboards: [
          {
            name: dashboardName,
            baselineId: 'service-overview-v1',
            templateVariables: {
              service: 'payments',
              environment: 'prod',
            },
          },
        ],
      } as any,
    })

    await action.handler(firstCtx)
    await action.handler(secondCtx)

    expect(listDashboards).toHaveBeenCalledTimes(2)
    expect(createDashboardApi).toHaveBeenCalledTimes(1)
    expect(getDashboard).toHaveBeenCalledWith({ dashboardId: 'abc123' })
    expect(updateDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        dashboardId: 'abc123',
        body: expect.objectContaining({ title: dashboardName }),
      }),
    )
    expect(secondCtx.output).toHaveBeenCalledWith('results', [
      {
        index: 0,
        name: dashboardName,
        baselineId: 'service-overview-v1',
        status: 'updated',
        dashboardId: 'abc123',
        dashboardUrl: 'https://app.datadoghq.com/dashboard/abc123',
      },
    ])
  })

  test('processes multiple dashboard selections and composes baseline content with display overrides', async () => {
    listDashboards
      .mockResolvedValueOnce({ dashboards: [] })
      .mockResolvedValueOnce({ dashboards: [] })
    createDashboardApi
      .mockResolvedValueOnce(createDashboard())
      .mockResolvedValueOnce(
        createDashboard({
          id: 'service-sli',
          title: 'Checkout SLI Dashboard',
          url: '/dashboard/service-sli',
        }),
      )

    const action = createDatadogDashboardAction({ config: createConfig() })
    const ctx = createMockActionContext({
      input: {
        projectKey: 'checkout-service',
        dashboards: [
          {
            name: 'Checkout Service Overview',
            baselineId: 'service-overview-v1',
            templateVariables: {
              service: 'checkout',
              environment: 'prod',
            },
          },
          {
            name: 'Checkout SLI Dashboard',
            baselineId: 'service-overview-v1',
            description: 'Checkout service SLI view',
            tags: ['team:payments'],
            templateVariables: {
              service: 'checkout',
              environment: 'staging',
            },
          },
        ],
      } as any,
    })

    await action.handler(ctx)

    expect(createDashboardApi).toHaveBeenCalledTimes(2)
    const firstPayload = createDashboardApi.mock.calls[0][0].body
    expect(firstPayload.description).toContain('checkout in prod')
    expect(JSON.stringify(firstPayload.widgets)).toContain('service:checkout')
    expect(JSON.stringify(firstPayload.widgets)).toContain('env:prod')

    const secondPayload = createDashboardApi.mock.calls[1][0].body
    expect(secondPayload.description).toBe('Checkout service SLI view')
    expect(secondPayload.tags).toEqual(
      expect.arrayContaining(['baseline:service-overview-v1', 'team:payments']),
    )

    expect(ctx.output).toHaveBeenCalledWith('results', [
      expect.objectContaining({
        index: 0,
        name: 'Checkout Service Overview',
        status: 'created',
      }),
      expect.objectContaining({
        index: 1,
        name: 'Checkout SLI Dashboard',
        status: 'created',
      }),
    ])
  })

  test('fails with explicit validation error when required dashboard fields are missing', async () => {
    const action = createDatadogDashboardAction({ config: createConfig() })
    const ctx = createMockActionContext({
      input: {
        projectKey: 'payments-service',
        dashboards: [
          {
            name: '',
            baselineId: '',
          },
        ],
      } as any,
    })

    await expect(action.handler(ctx)).rejects.toThrow(
      'Failed to provision 1 of 1 Datadog dashboard(s)',
    )

    expect(listDashboards).not.toHaveBeenCalled()
    expect(createDashboardApi).not.toHaveBeenCalled()
    expect(ctx.output).toHaveBeenCalledWith('results', [
      expect.objectContaining({
        index: 0,
        status: 'failed',
        error: expect.stringContaining(
          'dashboards[0].name must be a non-empty dashboard display name',
        ),
      }),
    ])
  })

  test('rejects duplicate dashboard names before provisioning starts', async () => {
    const action = createDatadogDashboardAction({ config: createConfig() })
    await expect(
      action.handler(
        createMockActionContext({
          input: {
            projectKey: 'payments-service',
            dashboards: [
              {
                name: 'Same Dashboard',
                baselineId: 'service-overview-v1',
              },
              {
                name: 'same dashboard',
                baselineId: 'service-overview-v1',
              },
            ],
          } as any,
        }),
      ),
    ).rejects.toThrow('Duplicate dashboard names are not allowed in one request')

    expect(listDashboards).not.toHaveBeenCalled()
  })

  test('fails clearly when a matching unmanaged dashboard exists', async () => {
    const projectKey = 'payments-service'
    listDashboards.mockResolvedValue({
      dashboards: [
        {
          id: 'unmanaged-123',
          title: 'Payments Service Overview',
          url: '/dashboard/unmanaged-123',
        },
      ],
    })
    getDashboard.mockResolvedValue(
      createDashboard({
        id: 'unmanaged-123',
        tags: [buildProjectKeyTag(projectKey)],
        url: '/dashboard/unmanaged-123',
      }),
    )

    const action = createDatadogDashboardAction({ config: createConfig() })
    const ctx = createMockActionContext({
      input: {
        projectKey,
        dashboards: [
          {
            name: 'Payments Service Overview',
            baselineId: 'service-overview-v1',
            templateVariables: {
              service: 'payments',
              environment: 'prod',
            },
          },
        ],
      } as any,
    })

    await expect(action.handler(ctx)).rejects.toThrow(
      'Failed to provision 1 of 1 Datadog dashboard(s)',
    )

    expect(listDashboards).toHaveBeenCalledTimes(1)
    expect(getDashboard).toHaveBeenCalledTimes(1)
    expect(createDashboardApi).not.toHaveBeenCalled()
    expect(ctx.output).toHaveBeenCalledWith('results', [
      expect.objectContaining({
        index: 0,
        status: 'failed',
        error: expect.stringContaining('is not managed by scaffolder'),
      }),
    ])
  })

  test('reports partial failures with index/name context and preserves successful dashboards', async () => {
    const projectKey = 'payments-service'
    listDashboards
      .mockResolvedValueOnce({ dashboards: [] })
      .mockResolvedValueOnce({
        dashboards: [
          {
            id: 'unmanaged-456',
            title: 'Payments SLI',
            url: '/dashboard/unmanaged-456',
          },
        ],
      })
    createDashboardApi.mockResolvedValue(
      createDashboard({
        id: 'created-123',
        title: 'Payments Service Overview',
        url: '/dashboard/created-123',
      }),
    )
    getDashboard.mockResolvedValue(
      createDashboard({
        id: 'unmanaged-456',
        title: 'Payments SLI',
        tags: [buildProjectKeyTag(projectKey)],
        url: '/dashboard/unmanaged-456',
      }),
    )

    const action = createDatadogDashboardAction({ config: createConfig() })
    const ctx = createMockActionContext({
      input: {
        projectKey,
        dashboards: [
          {
            name: 'Payments Service Overview',
            baselineId: 'service-overview-v1',
            templateVariables: {
              service: 'payments',
              environment: 'prod',
            },
          },
          {
            name: 'Payments SLI',
            baselineId: 'service-overview-v1',
            templateVariables: {
              service: 'payments',
              environment: 'prod',
            },
          },
        ],
      } as any,
    })

    await expect(action.handler(ctx)).rejects.toThrow(
      'Failed to provision 1 of 2 Datadog dashboard(s)',
    )

    expect(ctx.output).toHaveBeenCalledWith('results', [
      {
        index: 0,
        name: 'Payments Service Overview',
        baselineId: 'service-overview-v1',
        status: 'created',
        dashboardId: 'created-123',
        dashboardUrl: 'https://app.datadoghq.com/dashboard/created-123',
      },
      expect.objectContaining({
        index: 1,
        name: 'Payments SLI',
        status: 'failed',
        error: expect.stringContaining('is not managed by scaffolder'),
      }),
    ])
  })
})

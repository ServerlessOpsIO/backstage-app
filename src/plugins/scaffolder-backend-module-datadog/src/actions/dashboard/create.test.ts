import { createHash } from 'node:crypto'
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { createDatadogDashboardAction } from './create'

type TestConfig = {
  [key: string]: string | undefined
}

function createConfig(values: TestConfig = {}) {
  const defaults: TestConfig = {
    'scaffolder.datadog.apiKey': 'dd-api-key',
    'scaffolder.datadog.appKey': 'dd-app-key',
    'scaffolder.datadog.site': 'datadoghq.com',
  }
  const merged = { ...defaults, ...values }
  return {
    getOptionalString(path: string) {
      return merged[path]
    },
  } as any
}

function createResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  })
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

describe('x_datadog:dashboard:create', () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('creates a dashboard from a baseline and emits created output', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createResponse({
          dashboards: [],
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          id: 'abc123',
          title: 'Payments Service Overview',
          url: '/dashboard/abc123',
        }),
      )

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

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET')
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/dashboard')
    expect(fetchMock.mock.calls[1][1]?.method).toBe('POST')

    const createPayload = JSON.parse(String(fetchMock.mock.calls[1][1]?.body))
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

    fetchMock
      .mockResolvedValueOnce(
        createResponse({
          dashboards: [],
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          id: 'abc123',
          title: dashboardName,
          url: '/dashboard/abc123',
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          dashboards: [
            {
              id: 'abc123',
              title: dashboardName,
              url: '/dashboard/abc123',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          id: 'abc123',
          title: dashboardName,
          tags: [identityTag, projectKeyTag, 'serverlessops_scaffolder_managed:true'],
          url: '/dashboard/abc123',
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          id: 'abc123',
          title: dashboardName,
          url: '/dashboard/abc123',
        }),
      )

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

    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(fetchMock.mock.calls[1][1]?.method).toBe('POST')
    expect(fetchMock.mock.calls[3][1]?.method).toBe('GET')
    expect(fetchMock.mock.calls[4][1]?.method).toBe('PUT')
    expect(String(fetchMock.mock.calls[4][0])).toContain('/api/v1/dashboard/abc123')
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
    fetchMock
      .mockResolvedValueOnce(
        createResponse({
          dashboards: [],
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          id: 'service-overview',
          title: 'Checkout Service Overview',
          url: '/dashboard/service-overview',
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          dashboards: [],
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
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

    expect(fetchMock).toHaveBeenCalledTimes(4)
    const firstPayload = JSON.parse(String(fetchMock.mock.calls[1][1]?.body))
    expect(firstPayload.description).toContain('checkout in prod')
    expect(JSON.stringify(firstPayload.widgets)).toContain('service:checkout')
    expect(JSON.stringify(firstPayload.widgets)).toContain('env:prod')

    const secondPayload = JSON.parse(String(fetchMock.mock.calls[3][1]?.body))
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
})

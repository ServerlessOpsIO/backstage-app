import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { createDatadogAlarmAction } from './create'

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

describe('x_datadog:alarm:create', () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('creates a single monitor and emits created output', async () => {
    fetchMock
      .mockResolvedValueOnce(createResponse([]))
      .mockResolvedValueOnce(
        createResponse({
          id: 101,
          name: 'API latency high',
          overall_url: '/monitors/101',
        }),
      )

    const action = createDatadogAlarmAction({ config: createConfig() })
    const ctx = createMockActionContext({
      input: {
        projectIdentity: 'payments-service',
        monitors: [
          {
            name: 'API latency high',
            type: 'query alert',
            query: 'avg(last_5m):avg:trace.latency{service:payments} > 1',
            message: 'Latency above threshold @slack-platform-alerts',
          },
        ],
      } as any,
    })

    await action.handler(ctx)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const listCall = fetchMock.mock.calls[0]
    expect(String(listCall[0])).toContain('/api/v1/monitor?monitor_tags=')

    const createCall = fetchMock.mock.calls[1]
    expect(createCall[1]?.method).toBe('POST')
    const payload = JSON.parse(String(createCall[1]?.body))
    expect(payload.tags).toEqual(
      expect.arrayContaining([expect.stringMatching(/^serverlessops_scaffolder_identity:/)]),
    )

    expect(ctx.output).toHaveBeenCalledWith('results', [
      {
        index: 0,
        name: 'API latency high',
        status: 'created',
        monitorId: '101',
        monitorUrl: 'https://app.datadoghq.com/monitors/101',
      },
    ])
  })

  test('updates an existing monitor instead of creating a duplicate on retry', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createResponse([
          {
            id: 999,
            name: 'API latency high',
            overall_url: '/monitors/999',
          },
        ]),
      )
      .mockResolvedValueOnce(
        createResponse({
          id: 999,
          name: 'API latency high',
          overall_url: '/monitors/999',
        }),
      )

    const action = createDatadogAlarmAction({ config: createConfig() })
    const ctx = createMockActionContext({
      input: {
        projectIdentity: 'payments-service',
        monitors: [
          {
            name: 'API latency high',
            type: 'query alert',
            query: 'avg(last_5m):avg:trace.latency{service:payments} > 1',
            message: 'Latency above threshold @slack-platform-alerts',
          },
        ],
      } as any,
    })

    await action.handler(ctx)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1]?.method).toBe('PUT')
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/v1/monitor/999')
    expect(ctx.output).toHaveBeenCalledWith('results', [
      {
        index: 0,
        name: 'API latency high',
        status: 'updated',
        monitorId: '999',
        monitorUrl: 'https://app.datadoghq.com/monitors/999',
      },
    ])
  })

  test('processes multiple monitors in one action run', async () => {
    fetchMock
      .mockResolvedValueOnce(createResponse([]))
      .mockResolvedValueOnce(
        createResponse({ id: 1001, name: 'monitor-a', overall_url: '/monitors/1001' }),
      )
      .mockResolvedValueOnce(createResponse([]))
      .mockResolvedValueOnce(
        createResponse({ id: 1002, name: 'monitor-b', overall_url: '/monitors/1002' }),
      )

    const action = createDatadogAlarmAction({ config: createConfig() })
    const ctx = createMockActionContext({
      input: {
        projectIdentity: 'payments-service',
        monitors: [
          {
            name: 'monitor-a',
            type: 'query alert',
            query: 'avg(last_5m):avg:trace.errors{service:payments} > 1',
            message: 'Errors are elevated @slack-platform-alerts',
          },
          {
            name: 'monitor-b',
            type: 'query alert',
            query: 'avg(last_5m):avg:system.cpu.user{service:payments} > 90',
            message: 'CPU is elevated @slack-platform-alerts',
          },
        ],
      } as any,
    })

    await action.handler(ctx)

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(ctx.output).toHaveBeenCalledWith(
      'results',
      expect.arrayContaining([
        expect.objectContaining({ index: 0, name: 'monitor-a', status: 'created' }),
        expect.objectContaining({ index: 1, name: 'monitor-b', status: 'created' }),
      ]),
    )
  })

  test('fails with explicit message when project identity is missing', async () => {
    const action = createDatadogAlarmAction({ config: createConfig() })
    await expect(
      action.handler(
        createMockActionContext({
          input: {
            projectIdentity: '  ',
            monitors: [
              {
                name: 'monitor-a',
                type: 'query alert',
                query: 'avg(last_5m):avg:trace.errors{service:payments} > 1',
                message: 'Errors @slack-platform-alerts',
              },
            ],
          } as any,
        }),
      ),
    ).rejects.toThrow('projectIdentity must be a non-empty string')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('fails with explicit message when duplicate monitor names are supplied', async () => {
    const action = createDatadogAlarmAction({ config: createConfig() })
    await expect(
      action.handler(
        createMockActionContext({
          input: {
            projectIdentity: 'payments-service',
            monitors: [
              {
                name: 'same-monitor',
                type: 'query alert',
                query: 'avg(last_5m):avg:trace.errors{service:payments} > 1',
                message: 'Errors @slack-platform-alerts',
              },
              {
                name: 'same-monitor',
                type: 'query alert',
                query: 'avg(last_5m):avg:trace.latency{service:payments} > 1',
                message: 'Latency @slack-platform-alerts',
              },
            ],
          } as any,
        }),
      ),
    ).rejects.toThrow('Duplicate monitor names are not allowed in one request')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('returns monitor-specific validation failures for missing required fields', async () => {
    const action = createDatadogAlarmAction({ config: createConfig() })
    const ctx = createMockActionContext({
      input: {
        projectIdentity: 'payments-service',
        monitors: [
          {
            name: '',
            type: '',
            query: '',
            message: '',
          },
        ],
      } as any,
    })

    await expect(
      action.handler(ctx),
    ).rejects.toThrow('Failed to provision 1 of 1 Datadog monitor(s)')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(ctx.output).toHaveBeenCalledWith('results', [
      expect.objectContaining({
        index: 0,
        status: 'failed',
        error: expect.stringContaining('monitors[0].name must be a non-empty string'),
      }),
    ])
  })

  test('reports partial failures and preserves successful outcomes', async () => {
    fetchMock
      .mockResolvedValueOnce(createResponse([]))
      .mockResolvedValueOnce(
        createResponse({
          id: 777,
          name: 'valid-monitor',
          overall_url: '/monitors/777',
        }),
      )

    const action = createDatadogAlarmAction({ config: createConfig() })
    const ctx = createMockActionContext({
      input: {
        projectIdentity: 'payments-service',
        monitors: [
          {
            name: 'valid-monitor',
            type: 'query alert',
            query: 'avg(last_5m):avg:trace.errors{service:payments} > 1',
            message: 'Errors @slack-platform-alerts',
          },
          {
            name: 'invalid-monitor',
            type: 'query alert',
            query: '',
            message: 'No query provided @slack-platform-alerts',
          },
        ],
      } as any,
    })

    await expect(action.handler(ctx)).rejects.toThrow(
      'Failed to provision 1 of 2 Datadog monitor(s)',
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(ctx.output).toHaveBeenCalledWith('results', [
      {
        index: 0,
        name: 'valid-monitor',
        status: 'created',
        monitorId: '777',
        monitorUrl: 'https://app.datadoghq.com/monitors/777',
      },
      expect.objectContaining({
        index: 1,
        name: 'invalid-monitor',
        status: 'failed',
        error: expect.stringContaining('monitors[1].query must be a non-empty Datadog query'),
      }),
    ])
  })

  test('fails clearly when required Datadog config is missing', async () => {
    const action = createDatadogAlarmAction({
      config: createConfig({ 'scaffolder.datadog.appKey': undefined }),
    })

    await expect(
      action.handler(
        createMockActionContext({
          input: {
            projectIdentity: 'payments-service',
            monitors: [
              {
                name: 'monitor-a',
                type: 'query alert',
                query: 'avg(last_5m):avg:trace.errors{service:payments} > 1',
                message: 'Errors @slack-platform-alerts',
              },
            ],
          } as any,
        }),
      ),
    ).rejects.toThrow(
      'Missing required Datadog configuration key(s): scaffolder.datadog.appKey',
    )
  })
})

import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'
import { client, v1 } from '@datadog/datadog-api-client'

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

describe('x_datadog:alarm:create', () => {
  let listMonitors: jest.SpyInstance
  let createMonitor: jest.SpyInstance
  let updateMonitor: jest.SpyInstance

  beforeEach(() => {
    listMonitors = jest.spyOn(v1.MonitorsApi.prototype, 'listMonitors')
    createMonitor = jest.spyOn(v1.MonitorsApi.prototype, 'createMonitor')
    updateMonitor = jest.spyOn(v1.MonitorsApi.prototype, 'updateMonitor')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('creates a single monitor and emits created output', async () => {
    listMonitors.mockResolvedValueOnce([])
    createMonitor.mockResolvedValueOnce({ id: 101, name: 'API latency high' })

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
            options: { notify_no_data: true, thresholds: { critical: 1 } },
          },
        ],
      } as any,
    })

    await action.handler(ctx)

    expect(listMonitors).toHaveBeenCalledWith({
      monitorTags: expect.stringMatching(/^serverlessops_scaffolder_identity:/),
    })
    expect(updateMonitor).not.toHaveBeenCalled()
    expect(createMonitor).toHaveBeenCalledTimes(1)
    const { body } = createMonitor.mock.calls[0][0]
    expect(body.tags).toEqual(
      expect.arrayContaining([expect.stringMatching(/^serverlessops_scaffolder_identity:/)]),
    )
    expect(v1.ObjectSerializer.serialize(body, 'Monitor', '')).toEqual(
      expect.objectContaining({
        type: 'query alert',
        options: expect.objectContaining({
          notify_no_data: true,
          thresholds: { critical: 1 },
        }),
      }),
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
    listMonitors.mockResolvedValueOnce([{ id: 999, name: 'API latency high' }])
    updateMonitor.mockResolvedValueOnce({ id: 999, name: 'API latency high' })

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

    expect(createMonitor).not.toHaveBeenCalled()
    expect(updateMonitor).toHaveBeenCalledWith({
      monitorId: 999,
      body: expect.objectContaining({ name: 'API latency high' }),
    })
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
    listMonitors.mockResolvedValue([])
    createMonitor
      .mockResolvedValueOnce({ id: 1001, name: 'monitor-a' })
      .mockResolvedValueOnce({ id: 1002, name: 'monitor-b' })

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

    expect(listMonitors).toHaveBeenCalledTimes(2)
    expect(createMonitor).toHaveBeenCalledTimes(2)
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

    expect(listMonitors).not.toHaveBeenCalled()
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

    expect(listMonitors).not.toHaveBeenCalled()
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

    expect(listMonitors).not.toHaveBeenCalled()
    expect(ctx.output).toHaveBeenCalledWith('results', [
      expect.objectContaining({
        index: 0,
        status: 'failed',
        error: expect.stringContaining('monitors[0].name must be a non-empty string'),
      }),
    ])
  })

  test('reports partial failures and preserves successful outcomes', async () => {
    listMonitors.mockResolvedValueOnce([])
    createMonitor.mockResolvedValueOnce({ id: 777, name: 'valid-monitor' })

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

    expect(createMonitor).toHaveBeenCalledTimes(1)
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

  test('reports Datadog API errors for the affected monitor', async () => {
    listMonitors.mockResolvedValueOnce([])
    createMonitor.mockRejectedValueOnce(
      new client.ApiException(400, { errors: ['Invalid query'] }),
    )

    const action = createDatadogAlarmAction({ config: createConfig() })
    const ctx = createMockActionContext({
      input: {
        projectIdentity: 'payments-service',
        monitors: [
          {
            name: 'monitor-a',
            type: 'query alert',
            query: 'not a query',
            message: 'Errors @slack-platform-alerts',
          },
        ],
      } as any,
    })

    await expect(action.handler(ctx)).rejects.toThrow(
      'Datadog API request failed (400): Invalid query',
    )
    expect(ctx.output).toHaveBeenCalledWith('results', [
      expect.objectContaining({
        index: 0,
        status: 'failed',
        error: 'Datadog API request failed (400): Invalid query',
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

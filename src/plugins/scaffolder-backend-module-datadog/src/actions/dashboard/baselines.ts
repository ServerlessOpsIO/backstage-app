export type DashboardBaselineDefinition = {
  id: string
  titleTemplate: string
  layoutType: string
  widgets: unknown[]
  descriptionTemplate?: string
  templateVariableDefaults?: Record<string, string>
  tags?: string[]
}

const DASHBOARD_BASELINES: Record<string, DashboardBaselineDefinition> = {
  'service-overview-v1': {
    id: 'service-overview-v1',
    titleTemplate: '{{service}} service overview',
    layoutType: 'ordered',
    descriptionTemplate:
      'Operational overview for {{service}} in {{environment}} built from the reusable service-overview-v1 baseline.',
    templateVariableDefaults: {
      service: 'service',
      environment: 'environment',
    },
    tags: ['baseline:service-overview-v1'],
    widgets: [
      {
        definition: {
          type: 'timeseries',
          title: '{{service}} request throughput',
          requests: [
            {
              q: 'sum:trace.web.request.hits{service:{{service}},env:{{environment}}}.as_rate()',
            },
          ],
        },
      },
      {
        definition: {
          type: 'timeseries',
          title: '{{service}} p95 latency',
          requests: [
            {
              q: 'avg:trace.web.request.duration{service:{{service}},env:{{environment}},quantile:0.95}',
            },
          ],
        },
      },
    ],
  },
}

function applyTemplateVariablesToString(
  value: string,
  templateVariables: Record<string, string>,
): string {
  return value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key) => {
    if (typeof templateVariables[key] === 'string') {
      return templateVariables[key]
    }
    return ''
  })
}

function applyTemplateVariables<T>(
  value: T,
  templateVariables: Record<string, string>,
): T {
  if (typeof value === 'string') {
    return applyTemplateVariablesToString(value, templateVariables) as T
  }

  if (Array.isArray(value)) {
    return value.map(item => applyTemplateVariables(item, templateVariables)) as T
  }

  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    const mapped: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(record)) {
      mapped[key] = applyTemplateVariables(entry, templateVariables)
    }
    return mapped as T
  }

  return value
}

export function resolveDashboardBaseline(
  baselineId: string,
  templateVariables?: Record<string, string>,
): DashboardBaselineDefinition {
  const baseline = DASHBOARD_BASELINES[baselineId.trim()]
  if (!baseline) {
    throw new Error(
      `Unknown dashboard baselineId "${baselineId}". Add it to the Datadog baseline catalog before use`,
    )
  }

  const resolvedTemplateVariables = {
    ...(baseline.templateVariableDefaults ?? {}),
    ...(templateVariables ?? {}),
  }

  return {
    ...baseline,
    titleTemplate: applyTemplateVariables(
      baseline.titleTemplate,
      resolvedTemplateVariables,
    ),
    descriptionTemplate:
      typeof baseline.descriptionTemplate === 'string'
        ? applyTemplateVariables(
            baseline.descriptionTemplate,
            resolvedTemplateVariables,
          )
        : undefined,
    widgets: applyTemplateVariables(baseline.widgets, resolvedTemplateVariables),
    tags: baseline.tags?.map(tag =>
      applyTemplateVariables(tag, resolvedTemplateVariables),
    ),
  }
}

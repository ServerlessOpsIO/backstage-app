import { Config } from '@backstage/config'
import { createTemplateAction } from '@backstage/plugin-scaffolder-node'

type DashboardSelection = {
  name: string
  baselineId: string
  description?: string
  tags?: string[]
  templateVariables?: Record<string, string>
}

type DatadogDashboardCreateRequest = {
  projectKey: string
  dashboards: DashboardSelection[]
}

type DashboardProvisioningResult = {
  index: number
  name: string
  baselineId: string
  status: 'created' | 'updated' | 'failed'
  dashboardId?: string
  dashboardUrl?: string
  error?: string
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
      const results: DashboardProvisioningResult[] = input.dashboards.map(
        (dashboard, index) => ({
          index,
          name: dashboard.name,
          baselineId: dashboard.baselineId,
          status: 'failed',
          error:
            'Datadog dashboard baseline provisioning is scaffolded but not fully implemented yet',
        }),
      )

      ctx.output('results', results)
      throw new Error(
        'Datadog dashboard baseline provisioning has not been implemented yet',
      )
    },
  })
}

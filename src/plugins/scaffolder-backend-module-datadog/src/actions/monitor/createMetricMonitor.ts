import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { client, v1 } from '@datadog/datadog-api-client';
import { ConfigurationParameters } from '../config';

/**
 * Creates an `datadog:monitor:metric:create` Scaffolder action.
 *
 * @public
 */
export function createMetricMonitorAction(props: ConfigurationParameters) {
    // For more information on how to define custom actions, see
    //   https://backstage.io/docs/features/software-templates/writing-custom-actions
    return createTemplateAction<{
        name: string;
        query: string;
        message: string;
        priority: number;
        tags: string[];
    }>({
        id: 'datadog:monitor:metric:create',
        description: 'Create a Datadog metric monitor',
        supportsDryRun: true,
        schema: {
            input: {
                type: 'object',
                required: [
                    'name',
                    'query',
                    'message',
                    'priority',
                    'tags',
                ],
                properties: {
                    name: {
                        title: 'Name',
                        description: 'Name of the monitor',
                        type: 'string',
                    },
                    query: {
                        title: 'Query',
                        description: 'Query to monitor',
                        type: 'string',
                    },
                    message: {
                        title: 'Message',
                        description: 'Message to send when the monitor triggers',
                        type: 'string',
                    },
                    priority: {
                        title: 'Priority',
                        description: 'Priority of the monitor',
                        type: 'number',
                    },
                    tags: {
                        title: 'Tags',
                        description: 'Tags to attach to the monitor',
                        type: 'array',
                        items: {
                            type: 'string',
                        }
                    }
                },
            },
        },
        async handler(ctx) {
            const { server, ...datadogConfig } = props
            const config = client.createConfiguration(datadogConfig)
            if ( typeof server !== 'undefined' ) {
                config.setServerVariables({ site: server})
            }

            // For dry-run testing using site template editor
            if ( ctx.isDryRun ) {
                ctx.logger.info(`props: ${JSON.stringify(props, null, 4)}`)
                ctx.logger.info(`config: ${JSON.stringify(config, null, 4)}`)
                return
            }

            const monitorsApi = new v1.MonitorsApi(config);
            const monitor = await monitorsApi.createMonitor({
                body: {
                    type: 'query alert',
                    query: ctx.input.query,
                    name: ctx.input.name,
                    message: ctx.input.message,
                    priority: ctx.input.priority,
                    tags: ctx.input.tags,
                },
            });

            if (!monitor.created) {
                throw new Error('Failed to create monitor');
            }
        },
    });
}

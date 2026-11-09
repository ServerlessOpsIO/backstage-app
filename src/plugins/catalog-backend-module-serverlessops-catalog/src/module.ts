import {
    coreServices,
    createBackendModule,
    SchedulerServiceTaskRunner,
} from '@backstage/backend-plugin-api'
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node'
import { eventsServiceRef } from '@backstage/plugin-events-node'
import { EventProcessor } from './events/eventProcessor'
import { OutcomeLogger } from './events/outcomeLogger'
import {
    ProviderConfig,
    ServerlessOpsCatalogProvider,
} from './provider/ServerlessOpsCatalogProvider'

function defaultSchedule(): ProviderConfig['schedule'] {
    return {
        initialDelay: { seconds: 0 },
        frequency: { hours: 1 },
        timeout: { seconds: 60 },
    }
}

export const catalogModuleServerlessopsCatalog = createBackendModule({
    pluginId: 'catalog',
    moduleId: 'serverlessops-catalog',
    register(reg) {
        reg.registerInit({
            deps: {
                catalog: catalogProcessingExtensionPoint,
                events: eventsServiceRef,
                logger: coreServices.logger,
                rootConfig: coreServices.rootConfig,
                scheduler: coreServices.scheduler,
            },
            async init({ catalog, events, rootConfig, logger, scheduler }) {
                logger.info('Initializing ServerlessOps Catalog')

                const providerConfigPath = 'catalog.providers.serverlessops-catalog'
                const providerConfigSection = rootConfig.getOptionalConfig(providerConfigPath)
                if (!providerConfigSection) {
                    logger.info(
                        `Skipping ServerlessOps catalog provider; config "${providerConfigPath}" was not found`
                    )
                    return
                }

                const config = providerConfigSection.get() as ProviderConfig
                const taskRunner: SchedulerServiceTaskRunner =
                    scheduler.createScheduledTaskRunner(config.schedule ?? defaultSchedule())

                const provider = ServerlessOpsCatalogProvider.fromConfig(rootConfig, {
                    logger,
                    taskRunner,
                })
                catalog.addEntityProvider(provider)

                const eventConfig = provider.getEventProcessingConfig()
                if (!eventConfig?.topic) {
                    logger.info('ServerlessOps catalog event-driven processing is disabled')
                    return
                }

                const outcomeLogger = new OutcomeLogger(logger)
                const eventProcessor = new EventProcessor({
                    logger,
                    topic: eventConfig.topic,
                    maxReceiveCount: eventConfig.maxReceiveCount ?? 3,
                    handlers: {
                        create: async notification => provider.handleCreateNotification(notification),
                        update: async notification => provider.handleUpdateNotification(notification),
                        delete: async notification => provider.handleDeleteNotification(notification),
                    },
                    outcomeLogger,
                })

                await events.subscribe({
                    id: `${provider.getProviderName()}-events`,
                    topics: [eventConfig.topic],
                    onEvent: async params => {
                        await eventProcessor.process(params)
                    },
                })
            },
        })
    },
})

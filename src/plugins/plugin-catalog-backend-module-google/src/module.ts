import {
    coreServices,
    createBackendModule,
    SchedulerServiceTaskRunner,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha'
import {
    GoogleGroupProvider,
    GoogleUserProvider,
    ProviderConfig
} from './provider'

export const pluginCatalogModuleGoogle = createBackendModule({
    pluginId: 'catalog',
    moduleId: 'google',
    register(reg) {
        reg.registerInit({
            deps: {
                catalog: catalogProcessingExtensionPoint,
                logger: coreServices.logger,
                rootConfig: coreServices.rootConfig,
                scheduler: coreServices.scheduler
            },
            async init({ catalog, rootConfig, logger, scheduler }) {
                logger.info('Initializing Google User & Group Providers');

                const config = rootConfig.get('catalog.providers.google') as ProviderConfig | undefined

                // Create a scheduled task runner
                const schedule = config?.schedule ?
                    config?.schedule
                    : {
                        initialDelay: { seconds: 0 },
                        frequency: { hours: 1 },
                        timeout: { seconds: 60 }
                    }

                const taskRunner: SchedulerServiceTaskRunner =
                    scheduler.createScheduledTaskRunner(schedule);

                // Initialize the group provider
                catalog.addEntityProvider(
                    GoogleGroupProvider.fromConfig(
                        rootConfig,
                        {
                            logger,
                            taskRunner
                        }
                    )
                )
                // Initialize the user provider
                catalog.addEntityProvider(
                    GoogleUserProvider.fromConfig(
                        rootConfig,
                        {
                            logger,
                            taskRunner
                        }
                    )
                )
            },
        });
    },
});

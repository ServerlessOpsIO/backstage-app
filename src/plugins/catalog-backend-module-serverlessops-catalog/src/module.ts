import {
  coreServices,
  createBackendModule,
  SchedulerServiceTaskRunner
} from '@backstage/backend-plugin-api'
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha'
import {
  ServerlessOpsCatalogProvider,
  ProviderConfig
} from './provider/ServerlessOpsCatalogProvider'

export const catalogModuleServerlessopsCatalog = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'serverlessops-catalog',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        logger: coreServices.logger,
        rootConfig: coreServices.rootConfig,
        scheduler: coreServices.scheduler
      },
      async init({ catalog, rootConfig, logger, scheduler }) {
        logger.info('Initializing ServerlessOps Catalog')

        const config = rootConfig.get('catalog.providers.serverlessops-catalog') as ProviderConfig | undefined

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

        // Initialize the ServerlessOps Catalog provider
        catalog.addEntityProvider(
          ServerlessOpsCatalogProvider.fromConfig(
            rootConfig,
            {
              logger,
              taskRunner
            }
          )
        )
      },
    })
  },
})

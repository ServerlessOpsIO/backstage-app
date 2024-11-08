import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api'
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha'
import { ServerlessOpsCatalogProvider } from './provider/ServerlessOpsCatalogProvider'

export const catalogModuleServerlessopsCatalog = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'serverlessops-catalog',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        logger: coreServices.logger,
        rootConfig: coreServices.rootConfig
      },
      async init({ catalog, rootConfig, logger }) {
        logger.info('Initializing ServerlessOps Catalog')

        // Initialize the ServerlessOps Catalog provider
        catalog.addEntityProvider(
          ServerlessOpsCatalogProvider.fromConfig(
            rootConfig,
            { logger }
          )
        )
      },
    })
  },
})

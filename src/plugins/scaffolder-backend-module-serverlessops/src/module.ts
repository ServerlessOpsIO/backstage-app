import { CatalogClient } from '@backstage/catalog-client'
import {
    coreServices,
    createBackendModule
} from '@backstage/backend-plugin-api'
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha'
import { ProviderConfig } from '@internal/backstage-plugin-catalog-backend-module-serverlessops-catalog'

import {
    createServerlessOpsCatalogAction,
    deleteServerlessOpsCatalogAction,
    registerServerlessOpsCatalogAction
} from "./actions/serverlessops/catalog"

/**
 * A backend module that registers the action into the scaffolder
 */
export const scaffolderModule = createBackendModule({
    moduleId: 'serverlessops:catalog',
    pluginId: 'scaffolder',
    register({ registerInit }) {
        registerInit({
            deps: {
                scaffolderActions: scaffolderActionsExtensionPoint,
                rootConfig: coreServices.rootConfig,
                logger: coreServices.logger,
                discovery: coreServices.discovery,
                auth: coreServices.auth,
            },
            async init({ scaffolderActions, rootConfig, logger, discovery, auth }) {
                const configPath = 'catalog.providers.serverlessops-catalog'
                const config = rootConfig.get(configPath) as ProviderConfig | undefined

                const catalogClient = new CatalogClient({
                    discoveryApi: discovery,
                })

                if (typeof config === 'undefined') {
                    logger.error(
                        `serverlessops:catalog scaffolder config not found at ${configPath}`
                    )
                } else {
                    scaffolderActions.addActions(createServerlessOpsCatalogAction(config))
                    scaffolderActions.addActions(registerServerlessOpsCatalogAction(
                        catalogClient,
                        auth
                    ))
                    scaffolderActions.addActions(deleteServerlessOpsCatalogAction(
                        catalogClient,
                        auth,
                        config
                    ))
                }
            }
        })
    }
})

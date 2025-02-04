import {
    coreServices,
    createBackendModule
} from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
import { createMetricMonitorAction } from './actions/monitor';
import { ConfigurationParameters } from './actions/config';

/**
 * A backend module that registers the action into the scaffolder
 */
export const scaffolderModule = createBackendModule({
    moduleId: 'datadog:scaffolder',
    pluginId: 'scaffolder',
    register({ registerInit }) {
        registerInit({
            deps: {
                scaffolderActions: scaffolderActionsExtensionPoint,
                rootConfig: coreServices.rootConfig,
                logger: coreServices.logger,
            },
            async init({ scaffolderActions, rootConfig, logger }) {
                const configPath = 'integrations.datadog'
                const config = rootConfig.get(configPath) as ConfigurationParameters | undefined

                if ( typeof config === 'undefined' ) {
                    logger.error(
                        `datadog:scaffolder config not found at ${configPath}`
                    )
                } else {
                    scaffolderActions.addActions(createMetricMonitorAction(config));
                }
            }
        });
    },
})

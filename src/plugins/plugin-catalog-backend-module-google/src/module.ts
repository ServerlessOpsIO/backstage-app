import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';

export const pluginCatalogModuleGoogle = createBackendModule({
  pluginId: 'plugin-catalog',
  moduleId: 'google',
  register(reg) {
    reg.registerInit({
      deps: { logger: coreServices.logger },
      async init({ logger }) {
        logger.info('Hello World!');
      },
    });
  },
});

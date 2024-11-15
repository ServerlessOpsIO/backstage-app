import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const catalogPlugin = createPlugin({
  id: 'serverlessops-catalog',
  routes: {
    root: rootRouteRef,
  },
});

export const SoCatalogIndexPage = catalogPlugin.provide(
  createRoutableExtension({
    name: 'SoCatalogIndexPage',
    component: () =>
      import('./components/CatalogIndexPage').then(m => m.CatalogIndexPage),
    mountPoint: rootRouteRef,
  }),
);

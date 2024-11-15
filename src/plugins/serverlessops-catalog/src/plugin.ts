import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const SoCatalogPlugin = createPlugin({
  id: 'serverlessops-catalog',
  routes: {
    root: rootRouteRef,
  },
});

export const SoCatalogIndexPageEntityList = SoCatalogPlugin.provide(
  createRoutableExtension({
    name: 'SoCatalogIndexPageEntityList',
    component: () =>
      import('./components/CatalogIndexPageEntityList').then(m => m.CatalogIndexPageEntityList),
    mountPoint: rootRouteRef,
  }),
);

export const SoTabbedCatalogIndexPage = SoCatalogPlugin.provide(
  createRoutableExtension({
    name: 'SoTabbedCatalogIndexPage',
    component: () =>
      import('./components/TabbedCatalogIndexPage').then(m => m.TabbedCatalogIndexPage),
    mountPoint: rootRouteRef,
  }),
);

export const SoTabbedDirectoryIndexPage = SoCatalogPlugin.provide(
  createRoutableExtension({
    name: 'SoTabbedDirectoryIndexPage',
    component: () =>
      import('./components/TabbedDirectoryIndexPage').then(m => m.TabbedDirectoryIndexPage),
    mountPoint: rootRouteRef,
  }),
);

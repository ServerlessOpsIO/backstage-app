import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const catalogPlugin = createPlugin({
  id: 'catalog',
  routes: {
    root: rootRouteRef,
  },
});

export const CatalogPage = catalogPlugin.provide(
  createRoutableExtension({
    name: 'CatalogPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);

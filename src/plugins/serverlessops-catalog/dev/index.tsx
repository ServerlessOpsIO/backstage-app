import { createDevApp } from '@backstage/dev-utils';
import { soCatalogPlugin, SoTabbedCatalogIndexPage } from '../src/plugin';

createDevApp()
  .registerPlugin(soCatalogPlugin)
  .addPage({
    element: <SoTabbedCatalogIndexPage />,
    title: 'Root Page',
    path: '/catalog',
  })
  .render();

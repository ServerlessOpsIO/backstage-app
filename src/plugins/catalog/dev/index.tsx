import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { catalogPlugin, CatalogPage } from '../src/plugin';

createDevApp()
  .registerPlugin(catalogPlugin)
  .addPage({
    element: <CatalogPage />,
    title: 'Root Page',
    path: '/catalog',
  })
  .render();

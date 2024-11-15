import { Page, Header, TabbedLayout } from '@backstage/core-components';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import {
  CatalogEntityPage,
  CatalogIndexPage as BackstageCatalogIndexPage,
  catalogPlugin,
} from '@backstage/plugin-catalog';
import React from 'react';

export const CatalogIndexPage = () => {
  const configApi = useApi(configApiRef);
  const organizationName =
    configApi.getOptionalString('organization.name') ?? 'Backstage';

  return (
    <Page themeId="service">
      <Header
        title="Catalog"
        subtitle={`Explore the ${organizationName} catalog`}
      />
      <TabbedLayout>
        <TabbedLayout.Route path="/components" title="Components">
          <BackstageCatalogIndexPage
            initialKind="component"
            initiallySelectedFilter="all"
          />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/resources" title="Resources">
          <BackstageCatalogIndexPage
            initialKind="resource"
            initiallySelectedFilter="all"
          />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/systems" title="Systems">
          <BackstageCatalogIndexPage
            initialKind="system"
            initiallySelectedFilter="all"
          />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/domains" title="Domains">
          <BackstageCatalogIndexPage
            initialKind="domain"
            initiallySelectedFilter="all"
          />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/apis" title="APIs">
          <BackstageCatalogIndexPage
            initialKind="api"
            initiallySelectedFilter="all"
          />
        </TabbedLayout.Route>
      </TabbedLayout>
    </Page>
  );
};
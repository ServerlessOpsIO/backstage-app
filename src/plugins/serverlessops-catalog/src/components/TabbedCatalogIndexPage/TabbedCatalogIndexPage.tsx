import React from 'react';
import { PageWithHeader, TabbedLayout } from '@backstage/core-components';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import {
  ApiCatalogIndexPageEntityList,
  ComponentCatalogIndexPageEntityList,
  DomainCatalogIndexPageEntityList,
  ResourceCatalogIndexPageEntityList,
  SystemCatalogIndexPageEntityList
} from '../CatalogIndexPageEntityList';


export function TabbedCatalogIndexPage() {

  const configApi = useApi(configApiRef);
  const organizationName =
    configApi.getOptionalString('organization.name') ?? 'Backstage';

  return (
    <PageWithHeader
      themeId="service"
      title={`${organizationName} Catalog`}
      subtitle={`Organization software entities`}
    >
      <TabbedLayout>
        <TabbedLayout.Route path="/components" title="Components">
          <ComponentCatalogIndexPageEntityList />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/resources" title="Resources">
          <ResourceCatalogIndexPageEntityList />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/systems" title="Systems">
          <SystemCatalogIndexPageEntityList />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/domains" title="Domains">
          <DomainCatalogIndexPageEntityList />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/apis" title="APIs">
          <ApiCatalogIndexPageEntityList />
        </TabbedLayout.Route>
      </TabbedLayout>
    </PageWithHeader>
  );
};

import React from 'react';
import {  PageWithHeader, TabbedLayout } from '@backstage/core-components';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import {
  GroupCatalogIndexPageEntityList,
  UserCatalogIndexPageEntityList,
} from '../CatalogIndexPageEntityList';


export function TabbedDirectoryIndexPage() {

  const configApi = useApi(configApiRef);
  const organizationName =
    configApi.getOptionalString('organization.name') ?? 'Backstage';

  return (
    <PageWithHeader
      themeId="service"
      title={`${organizationName} Directory`}
      subtitle='Organization users & groups'
    >
      <TabbedLayout>
        <TabbedLayout.Route path="/users" title="Users">
          <UserCatalogIndexPageEntityList />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/groups" title="Groups">
          <GroupCatalogIndexPageEntityList />
        </TabbedLayout.Route>
      </TabbedLayout>
    </PageWithHeader>
  );
};

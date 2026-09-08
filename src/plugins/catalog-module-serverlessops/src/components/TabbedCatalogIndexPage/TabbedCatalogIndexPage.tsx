import { PageWithHeader, TabbedLayout } from '@backstage/core-components';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import {
  ApiCatalogIndexPageEntityList,
  ComponentCatalogIndexPageEntityList,
  DomainCatalogIndexPageEntityList,
  LocationCatalogIndexPageEntityList,
  ResourceCatalogIndexPageEntityList,
  SystemCatalogIndexPageEntityList
} from '../CatalogIndexPageEntityList';

type TabbedCatalogIndexPageProps = {
  pagination?: {
    mode?: 'offset' | 'cursor';
    limit?: number;
  };
};

export function TabbedCatalogIndexPage({ pagination }: TabbedCatalogIndexPageProps) {

  const configApi = useApi(configApiRef);
  const organizationName =
    configApi.getOptionalString('organization.name') ?? 'Backstage';

  return (
    <PageWithHeader
      themeId="service"
      title={`${organizationName} Catalog`}
      subtitle='Organization software entities'
    >
      <TabbedLayout>
        <TabbedLayout.Route path="/components" title="Components">
          <ComponentCatalogIndexPageEntityList pagination={pagination} />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/resources" title="Resources">
          <ResourceCatalogIndexPageEntityList pagination={pagination} />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/systems" title="Systems">
          <SystemCatalogIndexPageEntityList pagination={pagination} />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/domains" title="Domains">
          <DomainCatalogIndexPageEntityList pagination={pagination} />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/apis" title="APIs">
          <ApiCatalogIndexPageEntityList pagination={pagination} />
        </TabbedLayout.Route>
        <TabbedLayout.Route path="/locations" title="Locations">
          <LocationCatalogIndexPageEntityList pagination={pagination} />
        </TabbedLayout.Route>
      </TabbedLayout>
    </PageWithHeader>
  );
};

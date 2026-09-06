import { Grid } from '@material-ui/core';
import {
  EntityConsumedApisCard,
  EntityProvidedApisCard,
} from '@backstage/plugin-api-docs';
import {
  EntityDependsOnComponentsCard,
  EntityDependsOnResourcesCard,
  EntityLayout,
  EntitySwitch,
  isComponentType,
} from '@backstage/plugin-catalog';

import {
  CicdContent,
  DefaultEntityPage,
  OverviewContent,
  TechdocsContent,
} from './CommonCatalogEntityPage'

export const ServiceEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {OverviewContent}
    </EntityLayout.Route>

    <EntityLayout.Route path="/ci-cd" title="CI/CD">
      {CicdContent}
    </EntityLayout.Route>

    <EntityLayout.Route path="/api" title="API">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <EntityProvidedApisCard />
        </Grid>
        <Grid item md={6}>
          <EntityConsumedApisCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>

    <EntityLayout.Route path="/dependencies" title="Dependencies">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <EntityDependsOnComponentsCard />
        </Grid>
        <Grid item md={6}>
          <EntityDependsOnResourcesCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>

    <EntityLayout.Route path="/docs" title="Docs">
      {TechdocsContent}
    </EntityLayout.Route>
  </EntityLayout>
);

export const WebsiteEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {OverviewContent}
    </EntityLayout.Route>

    <EntityLayout.Route path="/ci-cd" title="CI/CD">
      {CicdContent}
    </EntityLayout.Route>

    <EntityLayout.Route path="/dependencies" title="Dependencies">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <EntityDependsOnComponentsCard />
        </Grid>
        <Grid item md={6}>
          <EntityDependsOnResourcesCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>

    <EntityLayout.Route path="/docs" title="Docs">
      {TechdocsContent}
    </EntityLayout.Route>
  </EntityLayout>
);

export const ComponentPage = (
  <EntitySwitch>
    <EntitySwitch.Case if={isComponentType('service')}>
      {ServiceEntityPage}
    </EntitySwitch.Case>

    <EntitySwitch.Case if={isComponentType('website')}>
      {WebsiteEntityPage}
    </EntitySwitch.Case>

    <EntitySwitch.Case>{DefaultEntityPage}</EntitySwitch.Case>
  </EntitySwitch>
);

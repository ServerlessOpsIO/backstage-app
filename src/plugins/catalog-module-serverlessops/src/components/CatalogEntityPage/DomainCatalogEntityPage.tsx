import { Grid } from '@material-ui/core';
import {
  EntityAboutCard,
  EntityHasSystemsCard,
  EntityLayout,
} from '@backstage/plugin-catalog';
import {
  EntityCatalogGraphCard,
} from '@backstage/plugin-catalog-graph';

import { EntityWarningContent } from './CommonCatalogEntityPage';

export const DomainPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3} alignItems="stretch">
        {EntityWarningContent}
        <Grid item md={6}>
          <EntityAboutCard />
        </Grid>
        <Grid item md={6} xs={12}>
          <EntityCatalogGraphCard height={400} />
        </Grid>
        <Grid item md={6}>
          <EntityHasSystemsCard
            title="Systems"
          />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);
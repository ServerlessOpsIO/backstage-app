import { Grid } from '@material-ui/core';
import {
  EntityLayout,
} from '@backstage/plugin-catalog';
import {
  EntityUserProfileCard,
  EntityOwnershipCard,
} from '@backstage/plugin-org';

import { EntityWarningContent } from './CommonCatalogEntityPage'

export const UserPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        {EntityWarningContent}
        <Grid item xs={12} md={6}>
          <EntityUserProfileCard />
        </Grid>
        <Grid item xs={12} md={6}>
          <EntityOwnershipCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);
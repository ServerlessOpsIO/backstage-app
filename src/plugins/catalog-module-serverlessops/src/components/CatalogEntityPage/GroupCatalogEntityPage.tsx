import { Grid } from '@material-ui/core';
import {
  EntityLayout,
  EntityLinksCard,
} from '@backstage/plugin-catalog';
import {
  EntityGroupProfileCard,
  EntityMembersListCard,
  EntityOwnershipCard,
} from '@backstage/plugin-org';

import { EntityWarningContent } from './CommonCatalogEntityPage';

export const GroupPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        {EntityWarningContent}
        <Grid item xs={12} md={6}>
          <EntityGroupProfileCard />
        </Grid>
        <Grid item xs={12} md={6}>
          <EntityOwnershipCard />
        </Grid>
        <Grid item xs={12} md={6}>
          <EntityMembersListCard />
        </Grid>
        <Grid item xs={12} md={6}>
          <EntityLinksCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);
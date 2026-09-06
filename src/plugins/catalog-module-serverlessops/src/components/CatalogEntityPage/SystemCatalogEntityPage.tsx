import { Grid } from '@material-ui/core';
import {
  EntityHasApisCard,
} from '@backstage/plugin-api-docs';
import {
  EntityAboutCard,
  EntityHasComponentsCard,
  EntityHasResourcesCard,
  EntityLayout,
  EntityLinksCard,
} from '@backstage/plugin-catalog';
import {
  Direction,
  EntityCatalogGraphCard,
} from '@backstage/plugin-catalog-graph';
import {
  RELATION_API_CONSUMED_BY,
  RELATION_API_PROVIDED_BY,
  RELATION_CONSUMES_API,
  RELATION_DEPENDENCY_OF,
  RELATION_DEPENDS_ON,
  RELATION_HAS_PART,
  RELATION_PART_OF,
  RELATION_PROVIDES_API,
} from '@backstage/catalog-model';

import {
  EntityWarningContent,
} from './CommonCatalogEntityPage';

export const SystemPage = (
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
        <Grid item md={4} xs={12}>
          <EntityLinksCard />
        </Grid>
        <Grid item md={8}>
          <EntityHasComponentsCard
            title="Components"
          />
        </Grid>
        <Grid item md={6}>
          <EntityHasApisCard
            title="APIs"
            variant="gridItem"
          />
        </Grid>
        <Grid item md={6}>
          <EntityHasResourcesCard
            title="Resources"
          />
        </Grid>
      </Grid>
    </EntityLayout.Route>
    <EntityLayout.Route path="/diagram" title="Diagram">
      <EntityCatalogGraphCard
        direction={Direction.TOP_BOTTOM}
        title="System Diagram"
        height={700}
        relations={[
          RELATION_PART_OF,
          RELATION_HAS_PART,
          RELATION_API_CONSUMED_BY,
          RELATION_API_PROVIDED_BY,
          RELATION_CONSUMES_API,
          RELATION_PROVIDES_API,
          RELATION_DEPENDENCY_OF,
          RELATION_DEPENDS_ON,
        ]}
        unidirectional={false}
      />
    </EntityLayout.Route>
  </EntityLayout>
);
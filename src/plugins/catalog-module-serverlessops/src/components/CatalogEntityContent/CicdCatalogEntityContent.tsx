import {
  useEntity,
  MissingAnnotationEmptyState,
} from '@backstage/plugin-catalog-react';
import { Grid, Typography } from '@material-ui/core';
import {
  EntityLatestGithubActionRunCard,
  // EntityRecentGithubActionsRunsCard,
  isGithubActionsAvailable,
  GITHUB_ACTIONS_ANNOTATION
} from '@backstage-community/plugin-github-actions';
import { EntityGithubDeploymentsCard } from '@backstage-community/plugin-github-deployments';

export const CicdCatalogEntityContent = () => {
  const { entity } = useEntity();
  if (!isGithubActionsAvailable(entity)) {
    return (
      <MissingAnnotationEmptyState annotation={GITHUB_ACTIONS_ANNOTATION} />
    );
  }

  return (
    <Grid container spacing={3} alignItems="stretch">
      <Grid item xs={12}>
        <Typography variant="h2">Build</Typography>
      </Grid>

      <Grid item xs={12}>
        <EntityLatestGithubActionRunCard />
      </Grid>

      {/*
      <Grid item xs={12}>
        <Typography variant="h6">Main branch</Typography>
      </Grid>
      <Grid item xs={12}>
        <EntityRecentGithubActionsRunsCard branch="main" limit={5} />
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h6">All branches</Typography>
      </Grid>
      <Grid item xs={12}>
        <EntityRecentGithubActionsRunsCard limit={10} />
      </Grid>
      */}

      <Grid item xs={12}>
        <Typography variant="h2">Deploy</Typography>
      </Grid>

      <Grid item xs={12}>
        <EntityGithubDeploymentsCard />
      </Grid>
    </Grid>
  );
};
import { Grid } from '@material-ui/core';
import { GithubIssuesCard } from '@backstage-community/plugin-github-issues'

export const ActivityCatalogEntityContent = () => {

  return (
    <Grid container spacing={3} alignItems="stretch">
      <Grid item xs={12}>
        <GithubIssuesCard itemsPerPage={10} itemsPerRepo={50} />
      </Grid>
    </Grid>
  );
};
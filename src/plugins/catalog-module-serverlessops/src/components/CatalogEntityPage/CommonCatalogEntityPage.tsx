import { Button, Grid } from '@material-ui/core';
import {
  EntityAboutCard,
  EntityHasSubcomponentsCard,
  EntityLayout,
  EntityLinksCard,
  EntitySwitch,
  EntityOrphanWarning,
  EntityProcessingErrorsPanel,
  hasCatalogProcessingErrors,
  isOrphan,
  hasRelationWarnings,
  EntityRelationWarning,
} from '@backstage/plugin-catalog';
import { EntityTechdocsContent } from '@backstage/plugin-techdocs';
import { EmptyState } from '@backstage/core-components';
import {
  EntityCatalogGraphCard,
} from '@backstage/plugin-catalog-graph';
import { TechDocsAddons } from '@backstage/plugin-techdocs-react';
import { ReportIssue } from '@backstage/plugin-techdocs-module-addons-contrib';

export const TechdocsContent = (
  <EntityTechdocsContent>
    <TechDocsAddons>
      <ReportIssue />
    </TechDocsAddons>
  </EntityTechdocsContent>
);

export const EntityWarningContent = (
  <>
    <EntitySwitch>
      <EntitySwitch.Case if={isOrphan}>
        <Grid item xs={12}>
          <EntityOrphanWarning />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>

    <EntitySwitch>
      <EntitySwitch.Case if={hasRelationWarnings}>
        <Grid item xs={12}>
          <EntityRelationWarning />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>

    <EntitySwitch>
      <EntitySwitch.Case if={hasCatalogProcessingErrors}>
        <Grid item xs={12}>
          <EntityProcessingErrorsPanel />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>
  </>
);


export const CicdContent = (
  // This is an example of how you can implement your company's logic in entity page.
  // You can for example enforce that all components of type 'service' should use GitHubActions
  <EntitySwitch>
    {/*
      Here you can add support for different CI/CD services, for example
      using @backstage-community/plugin-github-actions as follows:
      <EntitySwitch.Case if={isGithubActionsAvailable}>
        <EntityGithubActionsContent />
      </EntitySwitch.Case>
     */}

    <EntitySwitch.Case>
      <EmptyState
        title="No CI/CD available for this entity"
        missing="info"
        description="You need to add an annotation to your component if you want to enable CI/CD for it. You can read more about annotations in Backstage by clicking the button below."
        action={
          <Button
            variant="contained"
            color="primary"
            href="https://backstage.io/docs/features/software-catalog/well-known-annotations"
          >
            Read more
          </Button>
        }
      />
    </EntitySwitch.Case>
  </EntitySwitch>
);



export const OverviewContent = (
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
    <Grid item md={8} xs={12}>
      <EntityHasSubcomponentsCard
        title="Subcomponents"
      />
    </Grid>
  </Grid>
);


export const DefaultEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {OverviewContent}
    </EntityLayout.Route>

    <EntityLayout.Route path="/docs" title="Docs">
      {TechdocsContent}
    </EntityLayout.Route>
  </EntityLayout>
);

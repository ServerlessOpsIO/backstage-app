import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { configApiRef, googleAuthApiRef, useApi } from '@backstage/core-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { SignInPage } from '@backstage/core-components';
import { createFrontendModule } from '@backstage/frontend-plugin-api';

// external plugins
import githubActionsPlugin from '@backstage-community/plugin-github-actions/alpha';
import githubDeploymentsPlugin from '@backstage-community/plugin-github-deployments/alpha';
import githubIssuesPlugin from '@backstage-community/plugin-github-issues/alpha';
// local plugins
import serverlessOpsCatalogModule from '@internal/backstage-plugin-catalog-module-serverlessops';
import serverlessOpsApiDocsModule from '@internal/backstage-plugin-api-docs-module-serverlessops';
import appModuleNav from '@internal/backstage-plugin-app-module-nav';

const signInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => props => {
      const configApi = useApi(configApiRef);

      if (configApi.getString('auth.environment') === 'local') {
        return (
          <SignInPage
            {...props}
            providers={[
              'guest',
              {
                id: 'google',
                title: 'Google',
                message: 'Log in with Google',
                apiRef: googleAuthApiRef,
              }
            ]}
          />
        );
      }
      return (
        <SignInPage
          {...props}
          provider={
            {
              id: 'google',
              title: 'Google',
              message: 'Log in with Google',
              apiRef: googleAuthApiRef,
            }
          }
        />
      );
    },
  },
});
export default createApp({
  features: [
    catalogPlugin,
    githubActionsPlugin,
    githubDeploymentsPlugin,
    githubIssuesPlugin,
    serverlessOpsCatalogModule,
    serverlessOpsApiDocsModule,
    appModuleNav,
    createFrontendModule({
      pluginId: 'app',
      extensions: [signInPage],
    }),
  ],
});
import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { configApiRef, googleAuthApiRef, useApi } from '@backstage/core-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { InfoCard, SignInPage } from '@backstage/core-components';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import scaffolderPlugin from '@backstage/plugin-scaffolder/alpha';
import homePlugin from '@backstage/plugin-home/alpha';
import { homePageWidgetDataRef } from '@backstage/plugin-home-react/alpha';
import { CardExtensionProps } from '@backstage/plugin-home-react';
import { cloneElement, ReactElement } from 'react';
import './toolkit.css';

// external plugins
import githubActionsPlugin from '@backstage-community/plugin-github-actions/alpha';
import githubDeploymentsPlugin from '@backstage-community/plugin-github-deployments/alpha';
import githubIssuesPlugin from '@backstage-community/plugin-github-issues/alpha';
// local plugins
import serverlessOpsCatalogModule from '@internal/backstage-plugin-catalog-module-serverlessops';
import serverlessOpsApiDocsModule from '@internal/backstage-plugin-api-docs-module-serverlessops';
import appModuleNav from '@internal/backstage-plugin-app-module-nav';
import homeModuleInfoHub from '@internal/backstage-plugin-home-module-info-hub';
import soContextualEntityPickerModule from '@internal/backstage-plugin-scaffolder-entity-pickers';

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
    homePlugin.withOverrides({
      extensions: [
        homePlugin.getExtension('home-page-widget:home/toolkit').override({
          factory(originalFactory) {
            const widget = originalFactory().get(homePageWidgetDataRef);
            return [
              homePageWidgetDataRef({
                ...widget,
                component: cloneElement(
                  widget.component as ReactElement<CardExtensionProps<{}>>,
                  {
                    Renderer: ({ title, Content, ContextProvider }) => {
                      const content = <Content />;
                      return (
                        <InfoCard title={title} className="serverlessops-toolkit">
                          {ContextProvider ? (
                            <ContextProvider>{content}</ContextProvider>
                          ) : content}
                        </InfoCard>
                      );
                    },
                  },
                ),
              }),
            ];
          },
        }),
      ],
    }),
    homeModuleInfoHub,
    scaffolderPlugin,
    githubActionsPlugin,
    githubDeploymentsPlugin,
    githubIssuesPlugin,
    serverlessOpsCatalogModule,
    serverlessOpsApiDocsModule,
    appModuleNav,
    soContextualEntityPickerModule,
    createFrontendModule({
      pluginId: 'app',
      extensions: [signInPage],
    }),
  ],
});
import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { configApiRef, googleAuthApiRef, useApi } from '@backstage/core-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { SignInPage } from '@backstage/core-components';
import { createFrontendModule } from '@backstage/frontend-plugin-api';

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
    navModule,
    createFrontendModule({
      pluginId: 'app',
      extensions: [signInPage],
    }),
  ],
});
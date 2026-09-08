import {
  EntityCardBlueprint,
} from '@backstage/plugin-catalog-react/alpha';
import { createFrontendModule } from '@backstage/frontend-plugin-api';

// Cards
export const apiDocsProvidedApisEntityCard = EntityCardBlueprint.makeWithOverrides({
  name: 'provided-apis',
  factory(originalFactory) {

    return originalFactory({
      filter: { kind: 'component' },
      loader: async () => {
        const { EntityProvidedApisCard } = await import('@backstage/plugin-api-docs');
        return <EntityProvidedApisCard title="APIs" />;
      },
    });
  },
});

export const serverlessOpsApiDocsModule = createFrontendModule({
  pluginId: 'api-docs',
  extensions: [
    apiDocsProvidedApisEntityCard,
  ],
});

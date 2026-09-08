import {
  EntityCardBlueprint,
  EntityContentBlueprint
} from '@backstage/plugin-catalog-react/alpha';
import { GitHubIcon, UserIcon } from '@backstage/core-components'
import { z } from 'zod'
import {
  createFrontendModule,
  createRouteRef,
  ExtensionDefinition,
  PageBlueprint,
} from '@backstage/frontend-plugin-api'
import { RiGitPullRequestLine, RiMindMap } from "@remixicon/react"

const cicdRouteRef = createRouteRef()
const activityRouteRef = createRouteRef()
const tabbedDirectoryRouteRef = createRouteRef()
const relationsRouteRef = createRouteRef()

// Page Content
export const cicdCatalogEntityContent: ExtensionDefinition<any> = EntityContentBlueprint.make({
  name: 'cicd',
  params: {
    path: 'cicd',
    title: 'CI/CD',
    filter: 'kind:component',
    icon: <GitHubIcon />,
    routeRef: cicdRouteRef,
    loader: async () => {
      const { CicdCatalogEntityContent } = await import('./components/CatalogEntityContent/CicdCatalogEntityContent')
      return <CicdCatalogEntityContent />
    }
  },
})

export const activityCatalogEntityContent: ExtensionDefinition<any> = EntityContentBlueprint.make({
  name: 'activity',
  params: {
    path: 'activity',
    title: 'Activity',
    filter: 'kind:component',
    icon: <RiGitPullRequestLine />,
    routeRef: activityRouteRef,
    loader: async () => {
      const { ActivityCatalogEntityContent } = await import('./components/CatalogEntityContent/ActivityCatalogEntityContent')
      return <ActivityCatalogEntityContent />
    }
  },
})

export const relationsCatalogEntityContent: ExtensionDefinition<any> = EntityContentBlueprint.make({
  name: 'relations',
  params: {
    path: 'relations',
    title: 'Relations',
    icon: <RiMindMap />,
    routeRef: relationsRouteRef,
    loader: async () => {
      const { RelationsCatalogEntityContent } = await import('./components/CatalogEntityContent/RelationsCatalogEntityContent')
      return <RelationsCatalogEntityContent />
    }
  },
})

// Cards
export const catalogHasComponentsEntityCard: ExtensionDefinition<any> = EntityCardBlueprint.makeWithOverrides({
  name: 'has-components',
  factory(originalFactory) {

    return originalFactory({
      filter: { kind: 'system' },
      loader: async () => {
        const { EntityHasComponentsCard } = await import('@backstage/plugin-catalog');
        return <EntityHasComponentsCard title="Components" />;
      },
    });
  },
});

export const catalogHasResourcesEntityCard: ExtensionDefinition<any> = EntityCardBlueprint.makeWithOverrides({
  name: 'has-resources',
  factory(originalFactory) {

    return originalFactory({
      filter: { kind: 'system' },
      loader: async () => {
        const { EntityHasResourcesCard } = await import('@backstage/plugin-catalog');
        return <EntityHasResourcesCard title="Resources" />;
      },
    });
  },
});

export const catalogHasSystemsEntityCard: ExtensionDefinition<any> = EntityCardBlueprint.makeWithOverrides({
  name: 'has-systems',
  factory(originalFactory) {

    return originalFactory({
      filter: { kind: 'domain' },
      loader: async () => {
        const { EntityHasSystemsCard } = await import('@backstage/plugin-catalog');
        return <EntityHasSystemsCard title="Systems" />;
      },
    });
  },
});

// Pages
export const catalogTabbedIndexPage = PageBlueprint.makeWithOverrides({
  configSchema: {
    pagination: z
    .object({
      mode: z.enum(['offset', 'cursor']).optional(),
      limit: z.number().optional(),
    })
    .optional(),
  },
  factory(originalFactory, { config }) {
    return originalFactory({
      path: '/catalog',
      routeRef: createRouteRef({ aliasFor: 'catalog.catalogIndex' }),
      loader: async () => {
        const { TabbedCatalogIndexPage } = await import('./components/TabbedCatalogIndexPage')
        return <TabbedCatalogIndexPage pagination={config.pagination} />
      },
    })
  },
})

export const catalogTabbedDirectoryIndexPage = PageBlueprint.make({
  name: 'directory',
  params: {
    path: '/directory',
    title: 'Directory',
    icon: <UserIcon />,
    routeRef: tabbedDirectoryRouteRef,
    loader: async () => {
      const { TabbedDirectoryIndexPage } = await import('./components/TabbedDirectoryIndexPage')
      return <TabbedDirectoryIndexPage />
    }
  },
})

export const serverlessOpsCatalogModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [
    catalogHasComponentsEntityCard,
    catalogHasResourcesEntityCard,
    catalogHasSystemsEntityCard,
    catalogTabbedIndexPage,
    catalogTabbedDirectoryIndexPage,
    activityCatalogEntityContent,
    cicdCatalogEntityContent,
    relationsCatalogEntityContent
  ]
});

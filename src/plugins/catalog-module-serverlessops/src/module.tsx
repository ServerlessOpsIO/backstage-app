import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { GitHubIcon, UserIcon } from '@backstage/core-components'
import { z } from 'zod'
import {
    createFrontendModule,
    createRouteRef,
    PageBlueprint,
} from '@backstage/frontend-plugin-api'
import { RiGitPullRequestLine } from "@remixicon/react"

const cicdRouteRef = createRouteRef()
const activityRouteRef = createRouteRef()
const tabbedDirectoryRouteRef = createRouteRef()

export const SoCicdCatalogEntityContent = EntityContentBlueprint.make({
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

export const SoActivityCatalogEntityContent = EntityContentBlueprint.make({
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

export const SoCatalogTabbedIndexPage = PageBlueprint.makeWithOverrides({
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

export const SoCatalogTabbedDirectoryIndexPage = PageBlueprint.make({
    name: 'directory',
    params: {
        path: '/directory',
        title: 'Directory',
        icon: <UserIcon />,
        routeRef: tabbedDirectoryRouteRef,
        loader: async () => {
            const { TabbedDirectoryIndexPage } = await import('./components/TabbedDirectoryIndexPage')
            return < TabbedDirectoryIndexPage />
        }
    },
})

export const serverlessOpsCatalogModule = createFrontendModule({
    pluginId: 'catalog',
    extensions: [
        SoCatalogTabbedIndexPage,
        SoCatalogTabbedDirectoryIndexPage,
        SoActivityCatalogEntityContent,
        SoCicdCatalogEntityContent,
    ]
});

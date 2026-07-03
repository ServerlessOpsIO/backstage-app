import { UserIcon } from '@backstage/core-components'
import { z } from 'zod'
import {
    createFrontendModule,
    createRouteRef,
    PageBlueprint,
} from '@backstage/frontend-plugin-api'

const tabbedDirectoryRouteRef = createRouteRef()

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
    ]
});

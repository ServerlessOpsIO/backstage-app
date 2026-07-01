import { createElement } from 'react'
import {
    createFrontendPlugin,
    createRouteRef,
    PageBlueprint,
} from '@backstage/frontend-plugin-api'

const catalogIndexRouteRef = createRouteRef()
const tabbedCatalogRouteRef = createRouteRef()
const tabbedDirectoryRouteRef = createRouteRef()

export const SoCatalogIndexPageEntityList = PageBlueprint.make({
    name: 'catalog-index',
    params: {
        path: '/catalog-list',
        routeRef: catalogIndexRouteRef,
        loader: () =>
            import('./components/CatalogIndexPageEntityList').then(m =>
                createElement(m.CatalogIndexPageEntityList)
            ),
    },
})

export const SoTabbedCatalogIndexPage = PageBlueprint.make({
    name: 'tabbed-catalog',
    params: {
        path: '/catalog-tabbed',
        routeRef: tabbedCatalogRouteRef,
        loader: () =>
            import('./components/TabbedCatalogIndexPage').then(m =>
                createElement(m.TabbedCatalogIndexPage)
            ),
    },
})

export const SoTabbedDirectoryIndexPage = PageBlueprint.make({
    name: 'tabbed-directory',
    params: {
        path: '/directory',
        routeRef: tabbedDirectoryRouteRef,
        loader: () =>
            import('./components/TabbedDirectoryIndexPage').then(m =>
                createElement(m.TabbedDirectoryIndexPage)
            ),
    },
})

const serverlessOpsCatalogPlugin = createFrontendPlugin({
    pluginId: 'serverlessops-catalog',
    routes: {
        catalogIndex: catalogIndexRouteRef,
        tabbedCatalog: tabbedCatalogRouteRef,
        tabbedDirectory: tabbedDirectoryRouteRef,
    },
    extensions: [
        SoCatalogIndexPageEntityList,
        SoTabbedCatalogIndexPage,
        SoTabbedDirectoryIndexPage,
    ],
})

export default serverlessOpsCatalogPlugin

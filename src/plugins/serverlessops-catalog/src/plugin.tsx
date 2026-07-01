import { createElement } from 'react'
import {
    createFrontendPlugin,
    createRouteRef,
    PageBlueprint,
} from '@backstage/frontend-plugin-api'

export { TabbedCatalogIndexPage } from './components/TabbedCatalogIndexPage'

const catalogIndexRouteRef = createRouteRef()
const tabbedCatalogRouteRef = createRouteRef()
const tabbedDirectoryRouteRef = createRouteRef()

export const SoTabbedCatalogIndexPage = PageBlueprint.make({
    name: 'tabbed-catalog',
    params: {
      path: '/serverlessops-catalog/catalog',
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
        path: '/serverlessops-catalog/directory',
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
        SoTabbedCatalogIndexPage,
        SoTabbedDirectoryIndexPage,
    ],
})

export { serverlessOpsCatalogPlugin }
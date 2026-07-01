import { createDevApp } from '@backstage/frontend-dev-utils'
import serverlessOpsCatalogPlugin from '../src/alpha'

createDevApp({
    features: [serverlessOpsCatalogPlugin],
})

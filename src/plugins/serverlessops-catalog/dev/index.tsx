import { createDevApp } from '@backstage/frontend-dev-utils'
import serverlessOpsCatalogPlugin from '../src'

createDevApp({
    features: [serverlessOpsCatalogPlugin],
})

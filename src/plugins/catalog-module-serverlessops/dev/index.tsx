import { createDevApp } from '@backstage/frontend-dev-utils'
import serverlessOpsCatalogModule from '../src'

createDevApp({
    features: [serverlessOpsCatalogModule],
})

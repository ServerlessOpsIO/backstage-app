import serverlessOpsCatalogPlugin, {
    SoCatalogIndexPageEntityList,
    SoTabbedCatalogIndexPage,
    SoTabbedDirectoryIndexPage,
} from './alpha'

describe('catalog alpha', () => {
    test('should export plugin SoCatalogIndexPageEntityList', () => {
        expect(SoCatalogIndexPageEntityList).toBeDefined()
    })
    test('should export plugin SoTabbedCatalogIndexPage', () => {
        expect(SoTabbedCatalogIndexPage).toBeDefined()
    })
    test('should export plugin SoTabbedDirectoryIndexPage', () => {
        expect(SoTabbedDirectoryIndexPage).toBeDefined()
    })
    test('should export default alpha plugin', () => {
        expect(serverlessOpsCatalogPlugin).toBeDefined()
    })
})

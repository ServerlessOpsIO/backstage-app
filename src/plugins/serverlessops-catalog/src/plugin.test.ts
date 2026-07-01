import {
  SoCatalogIndexPageEntityList,
  SoTabbedCatalogIndexPage,
  SoTabbedDirectoryIndexPage,
  serverlessOpsCatalogPlugin,
} from './plugin';

describe('catalog', () => {
  it('should export plugin SoCatalogIndexPageEntityList', () => {
    expect(SoCatalogIndexPageEntityList).toBeDefined();
  });
  it('should export plugin SoTabbedCatalogIndexPage', () => {
    expect(SoTabbedCatalogIndexPage).toBeDefined();
  });
  it('should export plugin SoTabbedDirectoryIndexPage', () => {
    expect(SoTabbedDirectoryIndexPage).toBeDefined();
  });
  it('should export default plugin surface', () => {
    expect(serverlessOpsCatalogPlugin).toBeDefined();
  });
});

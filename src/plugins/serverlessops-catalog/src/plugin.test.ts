import {
  SoCatalogIndexPageEntityList,
  SoTabbedCatalogIndexPage,
  SoTabbedDirectoryIndexPage,
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
});

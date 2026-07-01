import {
  SoCatalogTabbedDirectoryIndexPage,
  SoCatalogTabbedIndexPage,
  serverlessOpsCatalogPlugin,
} from './plugin';

describe('catalog', () => {
  it('should export plugin SoCatalogTabbedDirectoryIndexPage', () => {
    expect(SoCatalogTabbedDirectoryIndexPage).toBeDefined();
  });
  it('should export plugin SoCatalogTabbedIndexPage', () => {
    expect(SoCatalogTabbedIndexPage).toBeDefined();
  });
  it('should export default plugin surface', () => {
    expect(serverlessOpsCatalogPlugin).toBeDefined();
  });
});

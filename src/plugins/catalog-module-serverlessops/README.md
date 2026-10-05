# @internal/backstage-plugin-catalog-module-serverlessops

This frontend module customizes the Backstage catalog experience for ServerlessOps.

It adds a set of entity pages and cards that surface operational context for catalog entities: CI/CD status, recent activity, relationship graphs, and a ServerlessOps-specific tabbed catalog experience.

## Features

- Custom entity content tabs for `CI/CD`, `Activity`, and `Relations`
- Catalog cards for `has-components`, `has-resources`, and `has-systems`
- A tabbed catalog index page and a dedicated directory landing page
- A ServerlessOps-oriented storefront for the catalog UI without replacing the base catalog plugin

## Included extensions

- `cicd` entity content tab
- `activity` entity content tab
- `relations` entity content tab
- `has-components` entity card
- `has-resources` entity card
- `has-systems` entity card
- `catalogTabbedIndexPage`
- `catalogTabbedDirectoryIndexPage`

## Registration

The module is registered as a frontend module for the `catalog` plugin:

```ts
export const serverlessOpsCatalogModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [
    catalogHasComponentsEntityCard,
    catalogHasResourcesEntityCard,
    catalogHasSystemsEntityCard,
    catalogTabbedIndexPage,
    catalogTabbedDirectoryIndexPage,
    activityCatalogEntityContent,
    cicdCatalogEntityContent,
    relationsCatalogEntityContent,
  ],
});
```

This is the main UI layer for presenting ServerlessOps metadata and relationships in the catalog.
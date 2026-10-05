# @internal/backstage-plugin-app-module-nav

This app module customizes the global Backstage navigation for the ServerlessOps deployment.

It replaces the default sidebar content with a layout tailored to the internal experience: search, catalog, scaffolder, and the ServerlessOps-specific directory page are kept visible and ordered intentionally.

## What it changes

- Adds a custom sidebar content override for the app plugin
- Keeps the standard search and notifications surfaces available
- Promotes the catalog, scaffolder, and ServerlessOps tabs in the main navigation
- Preserves Settings and other default app destinations

## Included navigation

- Search
- Home
- Catalog
- Catalog graph
- Scaffolder
- ServerlessOps directory
- Notifications
- Settings

## Registration

The module is registered as a frontend module for the `app` plugin and attaches a `NavContentBlueprint` override:

```ts
export const appModuleNav = createFrontendModule({
  pluginId: 'app',
  extensions: [SidebarContentOverride],
});
```

This is intended to make the app navigation reflect the ServerlessOps catalog model rather than the default Backstage sidebar content.

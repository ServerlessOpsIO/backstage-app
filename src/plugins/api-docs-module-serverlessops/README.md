# @internal/backstage-plugin-api-docs-module-serverlessops

This frontend module extends the Backstage API Docs experience for ServerlessOps-owned components.

It registers a custom `provided-apis` entity card for `kind:component` entities, allowing API information to appear directly on the component view without needing a custom app wrapper.

## What it adds

- Adds the API Docs `Provided APIs` card to catalog component pages
- Keeps ServerlessOps entities aligned with the default Backstage API docs UX
- Works as a frontend module for the `api-docs` plugin

## Registration

The module is exported as a frontend module under the `api-docs` plugin ID and registers the `provided-apis` extension:

```ts
export const serverlessOpsApiDocsModule = createFrontendModule({
  pluginId: 'api-docs',
  extensions: [apiDocsProvidedApisEntityCard],
});
```

## Usage

Import the module in the app and include it in the app feature list:

```ts
import serverlessOpsApiDocsModule from '@internal/backstage-plugin-api-docs-module-serverlessops';

export default createApp({
  features: [serverlessOpsApiDocsModule],
});
```

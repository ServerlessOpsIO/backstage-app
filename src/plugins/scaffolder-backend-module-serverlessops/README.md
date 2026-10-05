# @internal/backstage-plugin-scaffolder-backend-module-serverlessops

This backend module extends the Backstage Scaffolder with actions for the ServerlessOps catalog.

It registers ServerlessOps-specific template actions that create, register, and delete catalog entities through the provider-backed catalog API. This module depends on the ServerlessOps catalog backend module and reads the provider configuration under `catalog.providers.serverlessops-catalog`.

## Registered actions

- `serverlessops:catalog:create`
- `serverlessops:catalog:register`
- `serverlessops:catalog:delete`

These actions let templates create catalog entities in the same shape used by the ServerlessOps catalog source and keep them synchronized with the Backstage catalog.

## Typical flow

1. Load the `serverlessops-catalog` provider configuration
2. Construct a `CatalogClient` for Backstage lookup/registration operations
3. Register the custom scaffolder actions against the Scaffolder extension point
4. Use the actions from scaffolder templates to manage entities in the ServerlessOps catalog

## Configuration

```yaml
catalog:
  providers:
    serverlessops-catalog:
      baseUrl: https://serverlessops.example
      namespace: default
      entityKinds:
        - component
      auth:
        endpoint: https://auth.example/oauth/token
        clientId: ${SERVERLESSOPS_CLIENT_ID}
        clientSecret: ${SERVERLESSOPS_CLIENT_SECRET}
```

## Registration

The module is registered under the `scaffolder` plugin ID and adds the actions through `scaffolderActions.addActions(...)`.

# @internal/backstage-plugin-catalog-backend-module-serverlessops-catalog

This backend module synchronizes entities from the ServerlessOps catalog API into Backstage's catalog.

The module registers a `ServerlessOpsCatalogProvider` with the catalog processing extension point. It authenticates against the provider's auth endpoint, fetches entity lists and entity details for the configured kinds, and applies them as catalog entities with `location` and `originLocation` annotations pointing back to the ServerlessOps source.

## Supported behavior

- Reads configuration from `catalog.providers.serverlessops-catalog`
- Supports scheduled refreshes using the Backstage scheduler
- Reads multiple entity kinds from the configured namespace
- Authenticates using a JWT issued by the configured auth endpoint
- Publishes imported entities into the Backstage catalog

## Configuration

Expected config shape:

```yaml
catalog:
  providers:
    serverlessops-catalog:
      baseUrl: https://serverlessops.example
      namespace: default
      entityKinds:
        - component
        - system
        - domain
      auth:
        endpoint: https://auth.example/oauth/token
        clientId: ${SERVERLESSOPS_CLIENT_ID}
        clientSecret: ${SERVERLESSOPS_CLIENT_SECRET}
      schedule:
        frequency:
          hours: 1
        timeout:
          seconds: 60
```

## Why it exists

This module lets Backstage consume entity data from the external [ServerlessOpsIO/serverlessops-catalog-api](https://github.com/ServerlessOpsIO/serverlessops-catalog-api) service without duplicating the source of truth in local catalog configuration.
# @internal/backstage-plugin-catalog-backend-module-google

This backend module brings Google Workspace identity data into the Backstage catalog.

It registers the catalog providers for Google groups and Google users, scheduled via the Backstage scheduler, and loads the necessary admin credentials from the catalog provider configuration. The result is a catalog that can surface Google identities as entities for org and ownership data.

## What it does

- Registers a `GoogleGroupProvider`
- Registers a `GoogleUserProvider`
- Uses Google Admin Directory credentials to fetch user/group records
- Runs on the configured catalog refresh schedule

## Configuration

```yaml
catalog:
  providers:
    google:
      auth:
        adminAccountEmail: admin@example.com
        clientCredentials:
          type: service_account
          project_id: my-project
          private_key_id: ...
          private_key: ...
          client_email: ...
          client_id: ...
      schedule:
        frequency:
          hours: 1
        timeout:
          seconds: 60
```

## Registration

The module is initialized as a backend module for the `catalog` plugin and injects both providers into catalog processing:

```ts
catalog.addEntityProvider(GoogleGroupProvider.fromConfig(rootConfig, { logger, taskRunner }))
catalog.addEntityProvider(GoogleUserProvider.fromConfig(rootConfig, { logger, taskRunner }))
```

This keeps Google-owned identity data in sync with the catalog without requiring manual maintenance.

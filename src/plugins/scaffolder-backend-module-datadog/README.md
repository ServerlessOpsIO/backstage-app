# @internal/backstage-plugin-scaffolder-backend-module-datadog

Scaffolder backend module that adds Datadog provisioning actions to
[`@backstage/plugin-scaffolder-backend`](https://www.npmjs.com/package/@backstage/plugin-scaffolder-backend).

This module is registered under the `scaffolder` plugin ID (`moduleId:
datadog`) and uses one platform-configured Datadog account from Backstage app
configuration.

## Configuration

Set Datadog credentials and site in app config (environment-backed values are
recommended):

```yaml
scaffolder:
  datadog:
    site: ${DATADOG_SITE}
    apiKey: ${DATADOG_API_KEY}
    appKey: ${DATADOG_APP_KEY}
```

Required keys:

- `scaffolder.datadog.site`
- `scaffolder.datadog.apiKey`
- `scaffolder.datadog.appKey`

## Actions

### `x_datadog:alarm:create` (available)

Creates or updates Datadog metric monitors from scaffolder template input. The
action is idempotent by logical identity and emits per-monitor outcomes.

See source: `src/actions/alarm/create.ts`.

### `x_datadog:dashboard:create` (planned in spec 004)

The dashboard baseline provisioning action contract is defined in
`specs/004-datadog-dashboard-scaffolding/contracts/scaffolder-action.md`.

This action identifier is reserved for dashboard provisioning and will be
implemented in this module as part of spec 004.

## Registration

The backend app loads this module with:

```ts
backend.add(import('@internal/backstage-plugin-scaffolder-backend-module-datadog'))
```

This registration is already present in `src/packages/backend/src/index.ts`.

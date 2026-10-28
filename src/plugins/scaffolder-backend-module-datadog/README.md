# @internal/backstage-plugin-scaffolder-backend-module-datadog

Scaffolder backend module that adds Datadog provisioning actions to
[`@backstage/plugin-scaffolder-backend`](https://www.npmjs.com/package/@backstage/plugin-scaffolder-backend).

This module is registered under the `scaffolder` plugin ID (`moduleId:
datadog`) and uses one platform-configured Datadog account from Backstage app
configuration.

## Configuration

Set the Datadog site and credentials under `integrations.datadog` in app
config (environment-backed values are recommended):

```yaml
integrations:
  datadog:
    server: ${DATADOG_SITE}
    authMethods:
      apiKeyAuth: ${DATADOG_API_KEY}
      appKeyAuth: ${DATADOG_APP_KEY}
```

Required keys:

- `integrations.datadog.server`: the Datadog site, such as `datadoghq.com` or
  `us5.datadoghq.com`
- `integrations.datadog.authMethods.apiKeyAuth`
- `integrations.datadog.authMethods.appKeyAuth`

## Actions

### `x_datadog:alarm:create` (available)

Creates or updates Datadog metric monitors from scaffolder template input. The
action is idempotent by logical identity and emits per-monitor outcomes.

See source: `src/actions/alarm/create.ts`.

### `x_datadog:dashboard:create` (available)

Creates or updates one or more Datadog dashboards from reusable baseline
definitions in a single scaffolder step.

Key behavior:

- Requires a non-empty stable `projectKey` and at least one dashboard entry.
- Uses a baseline catalog (`baselineId`) plus template-provided display values
  (`name`, optional `description`, optional `tags`, optional
  `templateVariables`).
- No dashboard tags are generated automatically. Workflows may provide Datadog
  tags through the optional `tags` input; omitted tags are left unset (and are
  not overwritten during updates). The scaffolder's ownership marker is stored
  in the dashboard description.
- Is idempotent by logical identity (`projectKey + dashboard name`) and updates
  existing scaffolder-managed dashboards on retry.
- Emits one result per requested dashboard and fails the step when any required
  dashboard fails, while retaining successful dashboards.

Template step example:

```yaml
steps:
  - id: createDatadogDashboards
    name: Create Datadog dashboards
    action: x_datadog:dashboard:create
    input:
      projectKey: '{{ parameters.projectKey }}'
      dashboards:
        - name: '{{ parameters.name }} Service Overview'
          baselineId: service-overview-v1
          tags:
            - service:{{ parameters.name }}
            - env:{{ parameters.environment }}
          templateVariables:
            service: '{{ parameters.name }}'
            environment: '{{ parameters.environment }}'
```

Full contract and response shape:
`specs/004-datadog-dashboard-scaffolding/contracts/scaffolder-action.md`.

Troubleshooting:

- `projectKey` must be non-empty and dashboard names must be unique per request.
- Every dashboard item must provide non-empty `name` and `baselineId`.
- `baselineId` values must exist in the module baseline catalog.
- If a dashboard already exists for the same project key/name but is not marked
  as scaffolder-managed in its description (or legacy tags), provisioning fails
  with an ownership collision error and does not modify that dashboard.

## Registration

The backend app loads this module with:

```ts
backend.add(import('@internal/backstage-plugin-scaffolder-backend-module-datadog'))
```

This registration is already present in `src/packages/backend/src/index.ts`.

## Validation

Recommended validation commands after changes in this module:

```sh
cd src
yarn workspace @internal/backstage-plugin-scaffolder-backend-module-datadog test
yarn workspace @internal/backstage-plugin-scaffolder-backend-module-datadog lint
yarn tsc
```

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

### `x_datadog:dashboard:create` (available)

Creates or updates one or more Datadog dashboards from reusable baseline
definitions in a single scaffolder step.

Key behavior:

- Requires a non-empty stable `projectKey` and at least one dashboard entry.
- Uses a baseline catalog (`baselineId`) plus template-provided display values
  (`name`, optional `description`, optional `tags`, optional
  `templateVariables`).
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

## Registration

The backend app loads this module with:

```ts
backend.add(import('@internal/backstage-plugin-scaffolder-backend-module-datadog'))
```

This registration is already present in `src/packages/backend/src/index.ts`.

# Quickstart: Datadog Alarm Scaffolder Plugin

## Prerequisites

- Backend includes `@internal/backstage-plugin-scaffolder-backend-module-datadog`.
- Datadog runtime credentials are configured via environment-backed app config.
- Required config keys:
  - `integrations.datadog.server`
  - `integrations.datadog.authMethods.apiKeyAuth`
  - `integrations.datadog.authMethods.appKeyAuth`

  ```yaml
  integrations:
    datadog:
      server: ${DATADOG_SITE}
      authMethods:
        apiKeyAuth: ${DATADOG_API_KEY}
        appKeyAuth: ${DATADOG_APP_KEY}
  ```
- A scaffolder template step uses
  [`x_datadog:alarm:create`](./contracts/scaffolder-action.md).

## Validate the implementation

1. Run focused package tests from `src/`:

   ```sh
   yarn workspace @internal/backstage-plugin-scaffolder-backend-module-datadog test
   ```

2. Run repository application validation commands from `src/`:

   ```sh
   yarn tsc:full
   yarn build:all
   yarn test:all
   yarn lint:all
   ```

3. Add a scaffolder template step with a stable project identity and at least
   one monitor definition (see
   [contract example](./contracts/scaffolder-action.md#template-usage-example))
   and run a scaffold.
4. Confirm scaffold outputs include one result per monitor and contain Datadog
   identifiers for successful creations or updates.
5. Run with one intentionally invalid monitor in a multi-monitor set and verify
   the step fails with a monitor-specific error.
6. Retry the same scaffold input and verify existing Datadog alarms are updated
   rather than duplicated.

The runtime input/output shapes and failure semantics are detailed in
[data-model.md](./data-model.md).

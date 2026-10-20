# Quickstart: Datadog Dashboard Scaffolder Plugin Extension

## Prerequisites

- Backend includes `@internal/backstage-plugin-scaffolder-backend-module-datadog`.
- Datadog runtime credentials are configured in app config:
  - `scaffolder.datadog.site`
  - `scaffolder.datadog.apiKey`
  - `scaffolder.datadog.appKey`
- Module README exists at
  `src/plugins/scaffolder-backend-module-datadog/README.md` and documents
  Datadog scaffolder actions and configuration.
- A scaffolder template step uses
  [`x_datadog:dashboard:create`](./contracts/scaffolder-action.md).

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

3. Add a scaffolder template step with a stable `projectKey` and one or more
   dashboard selections (see
   [contract example](./contracts/scaffolder-action.md#template-usage-example))
   and run a scaffold.
4. Confirm scaffold outputs include one result per requested dashboard and
   include `status` (`created` or `updated`), `dashboardId`, and
   `dashboardUrl` for successful items.
5. Run with one intentionally invalid dashboard selection and confirm the step
   fails with a dashboard-specific error that identifies index/name.
6. Retry the same scaffold input and verify managed dashboards are updated
   rather than duplicated (`created` on first run, `updated` on retry).
7. Verify unmanaged dashboards with matching project identity are not modified
   and produce explicit ownership errors.

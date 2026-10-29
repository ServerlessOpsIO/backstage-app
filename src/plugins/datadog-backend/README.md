# Datadog backend

Provides the authenticated `/api/datadog/monitors` endpoint used by the homepage
Datadog Monitors widget. Implementation and colocated tests live under `src/`.

Register the plugin in the backend:

```ts
backend.add(import('@internal/backstage-plugin-datadog-backend'));
```

The plugin reads credentials and site settings from
`integrations.datadog.server`, `integrations.datadog.authMethods.apiKeyAuth`, and
`integrations.datadog.authMethods.appKeyAuth`. Credentials remain backend-only;
the application key needs `monitors_read` access.

Set `home.datadog.query` to the desired monitor search query. Results are restricted
to Alert and Warn states, with five monitors per page. The endpoint requires user
authentication and accepts a zero-based `page` query parameter.

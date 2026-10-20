# Scaffolder Action Contract

## Identifier

`x_datadog:dashboard:create`

## Input Contract

```yaml
projectKey: string                         # required, stable across retries
dashboards:
  - name: string                           # required, display name
    baselineId: string                     # required, reusable baseline selection
    description: string                    # optional display description override
    tags: [string]                         # optional extra tags
    templateVariables:                     # optional project-specific substitutions
      <key>: string
```

Rules:

- `projectKey` MUST be a non-empty, stable key for a project.
- `dashboards` MUST contain at least one entry.
- Dashboard `name` values MUST be unique within one request.
- Every dashboard entry MUST include non-empty `name` and `baselineId`.
- `baselineId` MUST resolve to a valid platform-managed reusable baseline.
- Invalid entries MUST fail validation with index/name-specific errors.

## Output Contract

```yaml
results:
  - index: number
    name: string
    baselineId: string
    status: created | updated | failed
    dashboardId: string                # on created or updated
    dashboardUrl: string               # on created or updated
    error: string                      # on failed
```

## Behavior Contract

- Uses one platform-configured Datadog account (`scaffolder.datadog.*`).
- Resolves each requested `baselineId` to reusable dashboard content and
  combines it with template-provided project display values.
- Persists a stable action-managed logical identity for each dashboard from
  `projectKey + dashboard name`.
- Updates an existing dashboard only when it is marked as scaffolder-managed.
- If a matching unmanaged dashboard exists, the item fails explicitly and is not
  modified.
- Emits per-dashboard outcomes for traceability and fails the scaffolder step
  when any required dashboard item fails.
- Keeps successfully provisioned dashboards when another dashboard in the same
  request fails.

## Template Usage Example

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
          description: 'Overview dashboard for {{ parameters.name }}'
          tags:
            - service:{{ parameters.name }}
            - env:{{ parameters.environment }}
          templateVariables:
            service: '{{ parameters.name }}'
            environment: '{{ parameters.environment }}'
        - name: '{{ parameters.name }} SLI'
          baselineId: service-overview-v1
          tags:
            - dashboard:sli
          templateVariables:
            service: '{{ parameters.name }}'
            environment: '{{ parameters.environment }}'
```

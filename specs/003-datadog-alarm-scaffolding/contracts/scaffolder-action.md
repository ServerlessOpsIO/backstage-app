# Scaffolder Action Contract

## Identifier

`x_datadog:alarm:create`

## Input Contract

```yaml
projectIdentity: string                # required, stable across retries
monitors:
  - name: string                     # required
    type: string                     # required, metric monitor type
    query: string                    # required
    message: string                  # required, includes notification destinations
    tags: [string]                   # optional
    options: {}                      # optional Datadog monitor options
    priority: number                 # optional
```

Rules:

- `monitors` MUST contain at least one entry.
- `projectIdentity` MUST be non-empty and stable for the same project.
- Every entry MUST include required monitor fields.
- `type` MUST be a supported metric monitor type (`query alert` or `metric alert`).
- Monitor names MUST be unique within a request.
- Invalid entries fail validation with index/name-specific errors.

## Output Contract

```yaml
results:
  - index: number
    name: string
    status: created | updated | failed
    monitorId: string                # on created or updated
    monitorUrl: string               # on created or updated
    error: string                    # on failed
```

## Behavior Contract

- Uses one platform-configured Datadog account.
- Processes all provided monitor definitions in a single scaffold step.
- Returns per-monitor outcomes for traceability.
- Fails the scaffolder step when any required monitor creation or update fails.
- Persists the `projectIdentity` and monitor name identity in an action-managed
  Datadog tag (`serverlessops_scaffolder_identity:<sha256>`). It uses that tag
  to update an existing logical monitor or create one when absent; retries do
  not create duplicate monitors.

## Template Usage Example

```yaml
steps:
  - id: createDatadogAlarms
    name: Create Datadog alarms
    action: x_datadog:alarm:create
    input:
      projectIdentity: '{{ parameters.name }}'
      monitors:
        - name: '{{ parameters.name }} API latency high'
          type: query alert
          query: avg(last_5m):p95:trace.flask.request{service:{{ parameters.name }}} > 1
          message: 'High latency detected @slack-platform-alerts'
          tags:
            - service:{{ parameters.name }}
            - env:{{ parameters.environment }}
```

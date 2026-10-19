# Scaffolder Action Contract

## Identifier

`x_datadog:alarm:create`

## Input Contract

```yaml
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
- Every entry MUST include required monitor fields.
- Invalid entries fail validation with index/name-specific errors.

## Output Contract

```yaml
results:
  - index: number
    name: string
    status: created | failed
    monitorId: string                # on created
    monitorUrl: string               # on created
    error: string                    # on failed
```

## Behavior Contract

- Uses one platform-configured Datadog account.
- Processes all provided monitor definitions in a single scaffold step.
- Returns per-monitor outcomes for traceability.
- Fails the scaffolder step when any required monitor creation fails.
- Retries are intentionally non-idempotent: repeated execution creates
  additional monitors rather than deduplicating by project identity/name.

## Template Usage Example

```yaml
steps:
  - id: createDatadogAlarms
    name: Create Datadog alarms
    action: x_datadog:alarm:create
    input:
      monitors:
        - name: '{{ parameters.name }} API latency high'
          type: query alert
          query: avg(last_5m):p95:trace.flask.request{service:{{ parameters.name }}} > 1
          message: 'High latency detected @slack-platform-alerts'
          tags:
            - service:{{ parameters.name }}
            - env:{{ parameters.environment }}
```

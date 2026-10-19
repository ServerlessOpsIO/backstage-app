# Data Model: Datadog Alarm Scaffolder Action

## Overview

This feature adds no persistent repository data model. It defines the runtime
contract and validation model for a scaffolder action invocation.

## Entity: DatadogMonitorDefinition

Template-provided full metric monitor definition.

| Field | Type | Required | Validation |
|---|---|---:|---|
| `name` | string | Yes | Non-empty |
| `type` | string | Yes | Must represent Datadog metric monitor type |
| `query` | string | Yes | Non-empty Datadog metric query |
| `message` | string | Yes | Non-empty; includes notification destinations |
| `tags` | string[] | No | Optional monitor tags |
| `options` | object | No | Optional Datadog monitor options |
| `priority` | number | No | Optional Datadog monitor priority |

## Entity: DatadogAlarmCreateRequest

Top-level action input.

| Field | Type | Required | Validation |
|---|---|---:|---|
| `monitors` | `DatadogMonitorDefinition[]` | Yes | `minItems = 1` |

## Entity: AlarmProvisioningResult

Per-monitor action outcome.

| Field | Type | Required | Description |
|---|---|---:|---|
| `index` | number | Yes | Original monitor index in input array |
| `name` | string | Yes | Monitor name from input |
| `status` | `"created"` \| `"failed"` | Yes | Outcome state |
| `monitorId` | string | On success | Datadog monitor identifier |
| `monitorUrl` | string | On success | URL for created Datadog monitor |
| `error` | string | On failure | Actionable failure reason |

## Entity: DatadogAccountConfig

Backend runtime configuration for one platform account.

| Field | Type | Required | Description |
|---|---|---:|---|
| `apiKey` | string | Yes | Datadog API key (secret) |
| `appKey` | string | Yes | Datadog application key (secret) |
| `site` | string | Yes | Datadog site (for example `datadoghq.com`) |

## State and Failure Semantics

- Every monitor entry is attempted in-order.
- The action reports one `AlarmProvisioningResult` per processed entry.
- If any required monitor fails, the scaffolder step fails.
- Retry behavior is non-idempotent by design: re-running the step creates
  additional monitors rather than deduplicating by name.

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
| `projectIdentity` | string | Yes | Non-empty and stable across retries for the same project |
| `monitors` | `DatadogMonitorDefinition[]` | Yes | `minItems = 1` |

## Entity: AlarmProvisioningResult

Per-monitor action outcome.

| Field | Type | Required | Description |
|---|---|---:|---|
| `index` | number | Yes | Original monitor index in input array |
| `name` | string | Yes | Monitor name from input |
| `status` | `"created"` \| `"updated"` \| `"failed"` | Yes | Outcome state |
| `monitorId` | string | On success | Datadog monitor identifier |
| `monitorUrl` | string | On success | URL for the Datadog monitor |
| `error` | string | On failure | Actionable failure reason |

## Entity: DatadogAccountConfig

Backend runtime configuration for one platform account, read from
`integrations.datadog`.

| Field | Type | Required | Description |
|---|---|---:|---|
| `authMethods.apiKeyAuth` | string | Yes | Datadog API key (secret) |
| `authMethods.appKeyAuth` | string | Yes | Datadog application key (secret) |
| `server` | string | Yes | Datadog site (for example `datadoghq.com`) |

## State and Failure Semantics

- Every monitor entry is attempted in-order.
- The action reports one `AlarmProvisioningResult` per processed entry.
- If any required monitor fails, the scaffolder step fails.
- The logical identity of a monitor is the pair of stable `projectIdentity` and
  monitor `name`; duplicate names for one project identity in a request are
  rejected.
- The action persists this logical identity as a stable, action-managed Datadog
  monitor tag and uses that tag for lookup; it does not rely on monitor name
  alone.
- On retry, a monitor with the same logical identity tag is updated; otherwise a
  monitor is created and tagged. Repeated execution therefore converges on one
  Datadog monitor per logical identity.

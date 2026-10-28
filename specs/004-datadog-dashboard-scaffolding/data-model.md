# Data Model: Datadog Dashboard Scaffolder Action

## Overview

This feature adds no persistent repository data model. It defines runtime
contracts and validation/state semantics for a scaffolder action invocation.

## Entity: DashboardSelection

Template-provided request item that selects a reusable baseline and applies
project-specific display values.

| Field | Type | Required | Validation |
|---|---|---:|---|
| `name` | string | Yes | Non-empty dashboard display name; unique per request for a given `projectKey` |
| `baselineId` | string | Yes | Non-empty; must map to a known reusable baseline |
| `description` | string | No | Optional non-empty display description override |
| `tags` | string[] | No | Optional Datadog dashboard tags provided by the workflow |
| `templateVariables` | Record<string, string> | No | Optional substitutions for baseline-declared variables |

## Entity: DatadogDashboardCreateRequest

Top-level action input.

| Field | Type | Required | Validation |
|---|---|---:|---|
| `projectKey` | string | Yes | Non-empty stable project key used across retries |
| `dashboards` | `DashboardSelection[]` | Yes | `minItems = 1`; duplicate `name` values rejected |

## Entity: DashboardBaselineDefinition

Platform-managed reusable dashboard baseline resolved by `baselineId`.

| Field | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Stable baseline identifier |
| `titleTemplate` | string | Yes | Baseline title pattern before project-specific substitution |
| `layoutType` | string | Yes | Datadog dashboard layout type (for example `ordered`) |
| `widgets` | object[] | Yes | Full baseline widget configuration |
| `descriptionTemplate` | string | No | Optional baseline description template |
| `templateVariableDefaults` | Record<string, string> | No | Optional default substitutions |

## Entity: DashboardProvisioningResult

Per-dashboard action outcome.

| Field | Type | Required | Description |
|---|---|---:|---|
| `index` | number | Yes | Original dashboard index in request |
| `name` | string | Yes | Dashboard display name from request |
| `baselineId` | string | Yes | Resolved baseline identifier |
| `status` | `"created"` \| `"updated"` \| `"failed"` | Yes | Provisioning outcome state |
| `dashboardId` | string | On success | Datadog dashboard identifier |
| `dashboardUrl` | string | On success | Datadog dashboard URL |
| `error` | string | On failure | Actionable failure reason |

## Entity: DatadogAccountConfig

Backend runtime configuration for the platform Datadog account.

| Field | Type | Required | Description |
|---|---|---:|---|
| `apiKey` | string | Yes | Datadog API key (secret) |
| `appKey` | string | Yes | Datadog application key (secret) |
| `site` | string | Yes | Datadog site domain (for example `datadoghq.com`) |

## State and Failure Semantics

- The action processes each dashboard request in-order and records one
  `DashboardProvisioningResult` per attempted dashboard.
- The action computes logical identity from `projectKey + name` and persists it
  as metadata in the dashboard description. Existing dashboards with legacy
  scaffolder identity tags remain recognized.
- If a matching logical dashboard is managed by the action, retries update it
  in place.
- If a matching logical dashboard exists but is unmanaged, the specific item
  fails with an explicit ownership error and is not modified.
- Successful dashboard updates/creations remain provisioned when other items
  fail in the same batch.
- The scaffolder step fails if any required dashboard result is `failed`.

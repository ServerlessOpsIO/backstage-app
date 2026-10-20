# Research: Datadog Dashboard Scaffolder Action

## Decision 1: Reuse the existing Datadog scaffolder backend module

- **Decision**: Implement dashboards inside
  `src/plugins/scaffolder-backend-module-datadog` instead of creating another
  Datadog module package.
- **Rationale**: The repository already contains Datadog action wiring,
  configuration loading, and scaffolder registration patterns in that module.
  Reuse reduces duplication and keeps Datadog ownership boundaries clear.
- **Alternatives considered**: Creating a new dedicated dashboard-only plugin.
  Rejected because it duplicates runtime wiring and scatters Datadog concerns.

## Decision 2: Expose a new action id `x_datadog:dashboard:create`

- **Decision**: Add action `x_datadog:dashboard:create` and register it through
  the same module extension point used by the alarm action.
- **Rationale**: The user explicitly requested this identifier, and it aligns
  with existing custom action naming conventions (`x_datadog:*`).
- **Alternatives considered**: `datadog:dashboard:create` without `x_` prefix
  or overloading the alarm action. Rejected for naming consistency and clarity.

## Decision 3: Use baseline selection + project-specific display values

- **Decision**: Require templates to pass a stable `projectKey` and an array of
  dashboard selections, where each selection references a reusable baseline and
  supplies project-specific display values.
- **Rationale**: Clarification requires templates to select reusable baselines,
  not provide complete dashboard definitions per template invocation.
- **Alternatives considered**: Accepting fully inlined Datadog dashboard JSON in
  each request. Rejected because it bypasses baseline reuse and increases drift.

## Decision 4: Enforce idempotency and managed-only updates

- **Decision**: Treat `projectKey + dashboard name` as logical identity, persist
  identity tags on scaffolder-created dashboards, update matching managed
  dashboards on retry, and fail clearly when a matching unmanaged dashboard is
  found.
- **Rationale**: FR-007 and edge cases require deterministic repeat execution
  without modifying unmanaged dashboards.
- **Alternatives considered**: Always creating new dashboards or updating any
  name match regardless of ownership. Rejected because both violate governance
  and create unsafe side effects.

## Decision 5: Keep partial successes and fail the step with granular outcomes

- **Decision**: Process all requested dashboards, emit one result per dashboard,
  keep successful dashboards provisioned, and fail the action if any result
  failed.
- **Rationale**: FR-004/FR-005/FR-006 require per-dashboard traceability and
  explicit partial-failure behavior.
- **Alternatives considered**: Full rollback on any failure. Rejected because
  clarification requires retaining successes.

## Decision 6: Require a first-class module README

- **Decision**: Add/update
  `src/plugins/scaffolder-backend-module-datadog/README.md` to document module
  purpose, required configuration, and both Datadog action contracts (including
  `x_datadog:dashboard:create` once implemented).
- **Rationale**: User requested a proper README and the repo’s conventions rely
  on plugin-local READMEs for operator and template-author guidance.
- **Alternatives considered**: Relying only on spec contracts under `specs/`.
  Rejected because implementation docs must live with the plugin package.

## Resolved Clarifications

All technical-context clarifications are resolved. No unresolved
`NEEDS CLARIFICATION` items remain.

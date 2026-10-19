# Research: Datadog Alarm Scaffolder Plugin

## Decision 1: Implement as a dedicated scaffolder backend module

- **Decision**: Create a new package under
  `src/plugins/scaffolder-backend-module-datadog` and register it in
  `src/packages/backend/src/index.ts`.
- **Rationale**: Existing custom scaffolder integrations are modularized as
  backend plugin modules, which keeps ownership boundaries clear and backend
  composition explicit.
- **Alternatives considered**: Extending
  `scaffolder-backend-module-serverlessops` directly. Rejected to avoid mixing
  unrelated catalog and Datadog responsibilities.

## Decision 2: Expose one action id and enforce metric-monitor-only input

- **Decision**: Implement `x_datadog:alarm:create` with input
  `monitors: DatadogMonitorDefinition[]` (`minItems: 1`) and validate each
  definition before API calls.
- **Rationale**: The feature requires templates to supply complete monitor
  definitions and requires clear per-entry validation failures. A typed array
  schema gives actionable errors and supports multi-monitor scaffolds.
- **Alternatives considered**: Accepting a single monitor per invocation or
  accepting loosely-typed JSON blobs. Rejected because this weakens
  usability/validation and conflicts with FR-002/FR-003.

## Decision 3: Use platform configuration for one Datadog account

- **Decision**: Read Datadog credentials/site from backend runtime
  configuration and do not allow templates to choose account credentials.
- **Rationale**: FR-009 requires one platform-configured account and the
  constitution requires environment-driven configuration and secret handling.
- **Alternatives considered**: User-scoped request secrets or account selection
  in action inputs. Rejected because they violate the single-account rule and
  complicate governance.

## Decision 4: Preserve duplicate creation on retries

- **Decision**: Always call Datadog monitor creation for every input monitor;
  do not perform idempotency checks by name/project identity.
- **Rationale**: FR-007 explicitly requires retry behavior to create another
  alarm even when a same-name alarm exists.
- **Alternatives considered**: Name-based lookup and update/upsert behavior.
  Rejected because it conflicts with required retry semantics.

## Decision 5: Return per-monitor outcomes with traceable references

- **Decision**: Emit output containing one result item per processed monitor
  with monitor name, Datadog monitor id/url when successful, and explicit error
  fields when failed.
- **Rationale**: FR-004 and FR-006 require users to trace scaffold output to
  specific alarm entries and failure reasons.
- **Alternatives considered**: Single aggregate status output. Rejected because
  it obscures which monitor failed.

## Resolved Clarifications

All technical context clarifications are resolved for planning. No unresolved
`NEEDS CLARIFICATION` items remain.

# Phase 0 Research: Event-Driven Catalog Updates

## Decision 1: Use Backstage Events + AWS SQS module for inbound notifications

- **Decision**: Use `@backstage/plugin-events-backend` with `@backstage/plugin-events-backend-module-aws-sqs` and configure a dedicated FIFO SQS queue topic for ServerlessOps catalog notifications.
- **Rationale**: This uses a first-party Backstage event ingestion path, avoids custom queue polling infrastructure, and keeps event transport configuration in `app-config*.yaml`.
- **Alternatives considered**:
  - Custom AWS SDK polling loop in provider code — rejected due to duplicated infrastructure concerns and weaker consistency with Backstage event architecture.
  - HTTP webhook ingress — rejected because the feature explicitly requires SQS-based delivery.

## Decision 2: Follow GitHub event-driven provider behavior pattern (topic subscription + provider-specific handling)

- **Decision**: Model provider event consumption after GitHub’s event-driven pattern: subscribe to a base topic and dispatch to provider logic based on event type metadata (`create`, `update`, `delete`).
- **Rationale**: The GitHub event module demonstrates a clear split between transport ingestion/routing and catalog provider behavior, which keeps provider logic testable and transport-agnostic.
- **Alternatives considered**:
  - Trigger full provider refresh for every event — rejected because it undermines the freshness/cost goals and negates event-driven benefits.
  - Introduce a separate custom router plugin just for this provider — rejected as unnecessary complexity for current scope.

## Decision 3: Preserve periodic polling as fallback, but reduce frequency

- **Decision**: Keep existing scheduled polling enabled as a fallback synchronization mechanism and lower its baseline frequency once event-driven updates are active.
- **Rationale**: This aligns with requirements for reliability and eventual consistency during event pipeline disruptions.
- **Alternatives considered**:
  - Remove polling entirely — rejected because it weakens recovery guarantees.
  - Keep current high-frequency polling unchanged — rejected because it does not deliver expected API/load reduction.

## Decision 4: Enforce FIFO ordering semantics at processing time

- **Decision**: Treat FIFO queue delivery order as authoritative for applying snapshots; do not introduce timestamp/version conflict resolution in this feature.
- **Rationale**: The specification explicitly requires FIFO-order snapshot application, even when fallback polling has already updated an entity.
- **Alternatives considered**:
  - Last-write-wins using event timestamps — rejected because it conflicts with explicit requirement FR-006.
  - Compare payload versions before mutation — rejected because producer ordering is the chosen consistency contract.

## Decision 5: Use bounded retries + DLQ redrive and record outcomes

- **Decision**: Use SQS retry/redrive behavior with bounded attempts and DLQ handoff; record per-notification outcomes (success/failure reason/DLQ disposition) through structured logging and metrics hooks.
- **Rationale**: Keeps failure handling explicit, avoids blocking subsequent messages, and supports operational support requirements.
- **Alternatives considered**:
  - Infinite in-process retries — rejected because it can block queue progress and violate bounded retry requirements.
  - Drop invalid messages without audit — rejected because it violates observability and supportability requirements.

## Decision 6: Validate notification payload shape at runtime

- **Decision**: Validate incoming change notifications against a documented schema before applying catalog mutations.
- **Rationale**: Protects provider logic from malformed payloads and supports deterministic failure routing.
- **Alternatives considered**:
  - Trust payload without validation — rejected due to reliability and security concerns.
  - Soft-accept unknown fields/types — rejected because deterministic behavior is required for retries and DLQ handling.

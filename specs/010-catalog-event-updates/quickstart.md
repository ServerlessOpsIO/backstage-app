# Quickstart: Validate Event-Driven ServerlessOps Catalog Updates

This guide validates the feature end to end using SQS FIFO-driven updates plus fallback polling.

## Prerequisites

1. Backstage backend dependencies installed (`yarn --cwd src install`).
2. AWS FIFO queue and DLQ created for catalog events.
3. Backstage config includes:
   - Provider config at `catalog.providers.serverlessops-catalog`
   - SQS topic config at `events.modules.awsSqs.awsSqsConsumingEventPublisher.topics.serverlessops.catalog`
4. Producer is publishing contract-compliant payloads (see `contracts/catalog-entity-change-notification.schema.json`).

## Local Validation Setup

```bash
yarn --cwd src install
yarn --cwd src workspace backend build
yarn --cwd src workspace @internal/backstage-plugin-catalog-backend-module-serverlessops-catalog test
```

## Implementation Validation Commands

Run these commands after implementation changes:

```bash
cd src && yarn workspace @internal/backstage-plugin-catalog-backend-module-serverlessops-catalog test --watch=false
sam validate --lint
sam build --parallel --template template.yaml
```

Expected outcomes:
- Catalog module tests pass for create/update/delete routing, idempotency, and retry outcome mapping.
- SAM template validation succeeds with no schema errors.
- SAM build completes with queue + DLQ + SSM parameter resources resolved.

Start backend:

```bash
yarn --cwd src workspace backend start
```

## Scenario A: Create Event Appears Without Poll Delay (P1)

1. Publish a `create` message to FIFO queue:
   - `MessageGroupId` set to stable group key (for example: entity namespace/kind/name family)
   - Payload conforms to schema contract
2. Verify entity appears in catalog within freshness target (<=60s for p95 goal).

Expected:
- Entity is added without waiting for scheduled full polling cycle.
- Processing outcome is logged as `applied`.

## Scenario B: Update and Delete Remain Accurate (P1)

1. Publish an `update` event for existing entity.
2. Publish a `delete` event for another existing entity.
3. Re-send one duplicate message for each case.

Expected:
- Entity fields update correctly.
- Delete follows existing provider removal semantics.
- Duplicates do not create duplicate entities or regress state.

## Scenario C: Missing Entity on Update (Edge Case)

1. Publish an `update` for entity absent in current Backstage state.

Expected:
- Provider attempts upstream fetch by `entityRef`.
- If upstream entity exists, provider adds it.
- Outcome is auditable with success/failure reason.

## Scenario D: Failure, Retry, and DLQ (Reliability)

1. Inject an invalid payload (for example missing `changeType`) and/or force processing failure.
2. Observe retry attempts via queue receive count.
3. After max attempts, verify message moves to DLQ.
4. Confirm outcome statuses by attempt:
   - attempts `< maxReceiveCount` => `failed`
   - attempt `>= maxReceiveCount` => `dlq-routed`

Expected:
- Retries are bounded.
- Failed message is DLQ-routed.
- Subsequent messages continue processing.
- Failure outcome and DLQ disposition are recorded.

## Scenario E: Fallback Polling Recovery (P2)

1. Pause or block event delivery temporarily.
2. Make upstream entity changes.
3. Wait for next fallback polling cycle.
4. Confirm convergence without manual intervention:
   - capture the pre-change catalog entity state
   - verify the entity state after one fallback polling interval
   - confirm the final state matches upstream source-of-truth

Expected:
- Catalog eventually converges to upstream state.
- Event outage does not require manual data correction.

## Observability and Acceptance Checks

- Confirm p95 end-to-end latency for valid notifications is within 60 seconds.
- Confirm success ratio target (>=99%) over sample period.
- Confirm polling frequency reduction objective (>=80% baseline reduction) while maintaining consistency.
- Confirm unauthorized queue publish/consume attempts are denied by IAM policy.

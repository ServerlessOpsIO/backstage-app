# Phase 1 Data Model: Event-Driven Catalog Updates

## Entity: CatalogEntityChangeNotification

Represents one upstream lifecycle change delivered through the SQS FIFO event channel.

### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `eventId` | string | Yes | Stable unique ID for idempotency/audit correlation. |
| `changeType` | enum(`create`,`update`,`delete`) | Yes | Determines mutation path. |
| `entityRef` | string | Yes | Stable entity reference (`<namespace>/<kind>/<name>`). |
| `entity` | object | Yes | Either a legacy Backstage entity snapshot or the producer's DynamoDB Stream AttributeValue image. |
| `source` | string | No | Producer identifier for diagnostics. |
| `occurredAt` | string (RFC3339 timestamp) | No | Producer event timestamp for observability only (not ordering authority). |
| `schemaVersion` | string | No | Optional payload version to support non-breaking evolution. |

### Validation Rules

- `changeType` must be one of the three supported values.
- `entityRef` must be non-empty and match provider entity identity constraints.
- `entity` must include `apiVersion`, `kind`, and `metadata.name`.
- DynamoDB images must include `pk`, `sk`, and `itemType: entity`; consumers verify the persisted identity, unmarshall the image, and remove these table-only fields before applying it.
- Unknown `changeType` or missing required fields is a processing failure and must be retried/then DLQ-routed.

## Entity: QueueDeliveryContext

Captures SQS delivery metadata used for diagnostics and retry behavior.

### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `messageId` | string | Yes | AWS-assigned message ID. |
| `messageGroupId` | string | Yes (FIFO) | Ordering group; must be present for FIFO. |
| `messageDeduplicationId` | string | No | Useful for producer-side duplicate tracing. |
| `approximateReceiveCount` | number | Yes | Used to observe bounded retry progression. |
| `queueUrl` | string | Yes | Source queue identifier. |
| `receivedAt` | string (RFC3339 timestamp) | Yes | Consumer receipt timestamp. |

## Entity: NotificationProcessingOutcome

Operational record for each processed notification.

### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `eventId` | string | Yes | Correlates with notification. |
| `entityRef` | string | Yes | Correlates with catalog target. |
| `status` | enum(`applied`,`rejected`,`failed`,`dlq-routed`) | Yes | Final handling state for the attempt lifecycle. |
| `reason` | string | No | Failure/rejection reason. |
| `changeType` | enum(`create`,`update`,`delete`) | Yes | Repeated for supportability. |
| `attemptCount` | number | Yes | Number of processing attempts observed. |
| `processedAt` | string (RFC3339 timestamp) | Yes | Finalization timestamp. |
| `delivery` | QueueDeliveryContext | Yes | Delivery metadata snapshot. |

## Relationships

- One `CatalogEntityChangeNotification` is delivered in one or more attempts, each tied to `QueueDeliveryContext`.
- One notification produces one terminal `NotificationProcessingOutcome`.
- `CatalogEntityChangeNotification.entityRef` maps to exactly one provider-managed Backstage catalog entity identity.

## State Transitions

1. `received` → `validated`
2. `validated` → `applied` (success) **or** `failed` (processing error)
3. `failed` with attempts remaining → re-queued by SQS redrive
4. `failed` with attempts exhausted → `dlq-routed`

## Idempotency + Ordering Constraints

- Processing must be idempotent by `eventId` + `entityRef` semantics.
- Snapshot application order is FIFO queue delivery order (per group), including cases where fallback polling updated state first.
- Duplicate notifications must not create duplicate catalog entities and must not violate provider ownership semantics.

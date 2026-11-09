# Event Topic Contract: ServerlessOps Catalog Changes

## Scope

This contract defines the event channel interface consumed by the ServerlessOps catalog provider when running in event-driven mode with SQS FIFO.

## Topic and Transport

- **Backstage topic**: `serverlessops-catalog`
- **Transport module**: `@backstage/plugin-events-backend-module-aws-sqs`
- **Queue type**: AWS SQS FIFO (`*.fifo`)
- **Delivery expectation**: FIFO order per message group, with SQS-managed retries and DLQ redrive

## Message Payload Contract

- Message payload MUST validate against `contracts/catalog-entity-change-notification.schema.json`.
- Producer MUST send one lifecycle change per message.
- Producer MUST assign a unique `eventId` to each logical change and preserve it when retrying or republishing the same notification. Distinct logical changes MUST have distinct IDs.
- `changeType` values:
  - `create`
  - `update`
  - `delete`

## Behavioral Contract

1. Consumer applies snapshots in queue delivery order.
2. `update` for a missing entity triggers retrieval of current entity and add-if-present behavior.
3. Duplicate notifications must not create duplicate entities.
4. Processing failures are retried up to queue redrive policy limit, then routed to DLQ.
5. Each terminal processing path emits an auditable outcome (success/failure reason/DLQ disposition).

## Configuration Contract (Backstage)

```yaml
events:
  modules:
    awsSqs:
      awsSqsConsumingEventPublisher:
        topics:
          serverlessops-catalog:
            queue:
              url: ${SERVERLESSOPS_CATALOG_EVENTS_QUEUE_URL} # must end with .fifo
              region: ${AWS_REGION}
            # Optional overrides:
            # visibilityTimeout: { seconds: 30 }
            # waitTime: { seconds: 20 }
            # timeout: { seconds: 60 }
            # waitTimeAfterEmptyReceive: { seconds: 5 }
```

## Security Contract

- Publish and consume access MUST be restricted to approved principals only.
- Queue and DLQ IAM policies MUST follow least privilege.
- Secrets (credentials, tokens) MUST be sourced from environment/secret management, not committed config.

### Least-Privilege IAM Requirements

- **Producer principal** (publish-only) MUST be limited to:
  - `sqs:GetQueueAttributes`
  - `sqs:GetQueueUrl`
  - `sqs:SendMessage`
  - Resource scope: catalog FIFO queue ARN only.
- **Backstage consumer principal** (consume-only) MUST be limited to:
  - `sqs:GetQueueAttributes`
  - `sqs:GetQueueUrl`
  - `sqs:ReceiveMessage`
  - `sqs:DeleteMessage`
  - `sqs:DeleteMessageBatch`
  - `sqs:ChangeMessageVisibility`
  - Resource scope: catalog FIFO queue ARN only.
- **DLQ access** MUST be explicit and minimal:
  - No application principal should have `sqs:PurgeQueue` or wildcard `sqs:*`.
  - Only approved operational roles may read DLQ messages for incident response.

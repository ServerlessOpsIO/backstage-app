# @internal/backstage-plugin-catalog-backend-module-serverlessops-catalog

This backend module synchronizes entities from the ServerlessOps catalog API into Backstage's catalog.

It combines two synchronization paths:

1. **Event-driven deltas** consumed from `serverlessops.catalog` via Backstage Events + AWS SQS.
2. **Scheduled fallback polling** to guarantee eventual convergence during event transport disruption.

The module registers a `ServerlessOpsCatalogProvider` with the catalog processing extension point, validates incoming notifications, routes `create|update|delete` change types, and records auditable processing outcomes (`applied`, `rejected`, `failed`, `dlq-routed`).

## Supported behavior

- Reads provider configuration from `catalog.providers.serverlessops-catalog`
- Supports event-driven `create`, `update`, and `delete` mutations
- Applies idempotency guard by producer `eventId + entityRef`
- Emits deterministic duplicate/unsupported outcomes with explicit reasons
- Tracks retry attempt count and terminal DLQ-compatible outcome mapping
- Preserves scheduled refresh fallback using the Backstage scheduler
- Reads multiple entity kinds from the configured namespace
- Authenticates using a JWT issued by the configured auth endpoint

## Configuration

Expected provider config shape:

```yaml
catalog:
  providers:
    serverlessops-catalog:
      baseUrl: https://serverlessops.example
      namespace: default
      entityKinds:
        - component
        - system
        - domain
      auth:
        endpoint: https://auth.example/oauth/token
        clientId: ${SERVERLESSOPS_CLIENT_ID}
        clientSecret: ${SERVERLESSOPS_CLIENT_SECRET}
      events:
        topic: serverlessops.catalog
        maxReceiveCount: 3
      schedule:
        frequency:
          hours: 2
        timeout:
          seconds: 60
```

Expected Backstage Events SQS topic config:

```yaml
events:
  modules:
    awsSqs:
      awsSqsConsumingEventPublisher:
        topics:
          serverlessops.catalog:
            queue:
              url: ${SERVERLESSOPS_CATALOG_EVENTS_QUEUE_URL}
              region: ${AWS_REGION}
            visibilityTimeout: { seconds: 60 }
            waitTime: { seconds: 20 }
            timeout: { seconds: 60 }
            waitTimeAfterEmptyReceive: { seconds: 5 }
```

## Why it exists

This module lets Backstage consume entity data from the external [ServerlessOpsIO/serverlessops-catalog-api](https://github.com/ServerlessOpsIO/serverlessops-catalog-api) service without duplicating the source of truth in local catalog configuration.
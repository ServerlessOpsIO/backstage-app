import { Entity } from '@backstage/catalog-model'

export type CatalogEntityChangeType = 'create' | 'update' | 'delete'

export type NotificationProcessingStatus =
    | 'applied'
    | 'rejected'
    | 'failed'
    | 'dlq-routed'

export interface CatalogEntityChangeNotification {
    eventId: string
    changeType: CatalogEntityChangeType
    entityRef: string
    entity: Entity
    source?: string
    occurredAt?: string
    schemaVersion?: string
}

export interface QueueDeliveryContext {
    messageId?: string
    messageGroupId?: string
    messageDeduplicationId?: string
    approximateReceiveCount: number
    queueUrl?: string
    receivedAt: string
}

export interface NotificationProcessingOutcome {
    eventId: string
    entityRef: string
    status: NotificationProcessingStatus
    reason?: string
    changeType: CatalogEntityChangeType
    attemptCount: number
    processedAt: string
    delivery: QueueDeliveryContext
}

export type NotificationValidationResult =
    | { ok: true; value: CatalogEntityChangeNotification }
    | { ok: false; reason: string }

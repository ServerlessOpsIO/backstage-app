import { LoggerService } from '@backstage/backend-plugin-api'
import { EventParams } from '@backstage/plugin-events-node'
import { validateNotificationPayload } from './notification-schema'
import { OutcomeLogger } from './outcome-logger'
import { ProcessedEventCache } from './processed-event-cache'
import {
    CatalogEntityChangeNotification,
    NotificationProcessingOutcome,
    NotificationProcessingStatus,
    QueueDeliveryContext,
} from './types'

export const DUPLICATE_EVENT_REASON = 'duplicate-event'
export const UNSUPPORTED_CHANGE_TYPE_REASON = 'unsupported-change-type'

export interface EventProcessorHandlers {
    create: (notification: CatalogEntityChangeNotification) => Promise<void>
    update: (notification: CatalogEntityChangeNotification) => Promise<void>
    delete: (notification: CatalogEntityChangeNotification) => Promise<void>
}

export interface EventProcessorOptions {
    logger: LoggerService
    topic: string
    handlers: EventProcessorHandlers
    outcomeLogger: OutcomeLogger
    maxReceiveCount?: number
    processedEventCache?: ProcessedEventCache
}

export class EventProcessor {
    private readonly logger: LoggerService
    private readonly topic: string
    private readonly handlers: EventProcessorHandlers
    private readonly outcomeLogger: OutcomeLogger
    private readonly maxReceiveCount: number
    private readonly processedEventCache: ProcessedEventCache

    constructor(options: EventProcessorOptions) {
        this.logger = options.logger.child({ target: 'serverlessops-catalog-event-processor' })
        this.topic = options.topic
        this.handlers = options.handlers
        this.outcomeLogger = options.outcomeLogger
        this.maxReceiveCount = options.maxReceiveCount ?? 3
        this.processedEventCache = options.processedEventCache ?? new ProcessedEventCache()
    }

    async process(params: EventParams): Promise<NotificationProcessingOutcome | undefined> {
        if (params.topic !== this.topic) {
            this.logger.debug(`Skipping unexpected topic ${params.topic}`)
            return undefined
        }

        const delivery = this.getDeliveryContext(params.metadata)
        const validation = validateNotificationPayload(params.eventPayload)

        if (!validation.ok) {
            const rawChangeType = this.rawChangeTypeFromPayload(params.eventPayload)
            const reason = (
                rawChangeType
                && !['create', 'update', 'delete'].includes(rawChangeType)
            )
                ? UNSUPPORTED_CHANGE_TYPE_REASON
                : validation.reason
            const status = (
                reason === UNSUPPORTED_CHANGE_TYPE_REASON
                || reason.startsWith('eventId minLength:')
                || reason.startsWith('entityRef pattern:')
            )
                ? 'rejected'
                : this.failureStatus(delivery.approximateReceiveCount)
            const outcome = this.toOutcome({
                eventId: this.eventIdFromPayload(params.eventPayload),
                entityRef: this.entityRefFromPayload(params.eventPayload),
                changeType: 'create',
                status,
                reason,
                delivery,
            })
            this.outcomeLogger.record(outcome)
            return outcome
        }

        const { eventId, entityRef, changeType } = validation.value
        if (this.processedEventCache.has(eventId, entityRef)) {
            const outcome = this.toOutcome({
                eventId,
                entityRef,
                changeType,
                status: 'rejected',
                reason: DUPLICATE_EVENT_REASON,
                delivery,
            })
            this.outcomeLogger.record(outcome)
            return outcome
        }

        try {
            await this.dispatchByChangeType(validation.value)
            this.processedEventCache.markProcessed(eventId, entityRef)

            const outcome = this.toOutcome({
                eventId,
                entityRef,
                changeType,
                status: 'applied',
                delivery,
            })
            this.outcomeLogger.record(outcome)
            return outcome
        } catch (error) {
            const reason = error instanceof Error ? error.message : 'unknown processing error'
            const outcome = this.toOutcome({
                eventId,
                entityRef,
                changeType,
                status: this.failureStatus(delivery.approximateReceiveCount),
                reason,
                delivery,
            })
            this.outcomeLogger.record(outcome)
            return outcome
        }
    }

    private async dispatchByChangeType(
        notification: CatalogEntityChangeNotification
    ): Promise<void> {
        switch (notification.changeType) {
            case 'create':
                await this.handlers.create(notification)
                return
            case 'update':
                await this.handlers.update(notification)
                return
            case 'delete':
                await this.handlers.delete(notification)
                return
            default: {
                const unknownType: never = notification.changeType
                throw new Error(
                    `${UNSUPPORTED_CHANGE_TYPE_REASON}:${unknownType}`
                )
            }
        }
    }

    private getDeliveryContext(
        metadata?: Record<string, string | string[] | undefined>
    ): QueueDeliveryContext {
        const approximateReceiveCount = this.metadataString(metadata, [
            'approximateReceiveCount',
            'ApproximateReceiveCount',
        ])
        const parsedReceiveCount = approximateReceiveCount ? Number(approximateReceiveCount) : NaN
        const receiveCount = Number.isInteger(parsedReceiveCount) && parsedReceiveCount > 0
            ? parsedReceiveCount
            : 1

        return {
            messageId: this.metadataString(metadata, ['messageId', 'MessageId']),
            messageGroupId: this.metadataString(metadata, ['messageGroupId', 'MessageGroupId']),
            messageDeduplicationId: this.metadataString(metadata, [
                'messageDeduplicationId',
                'MessageDeduplicationId',
            ]),
            approximateReceiveCount: receiveCount,
            queueUrl: this.metadataString(metadata, ['queueUrl', 'QueueUrl']),
            receivedAt: new Date().toISOString(),
        }
    }

    private metadataString(
        metadata: Record<string, string | string[] | undefined> | undefined,
        keys: string[],
    ): string | undefined {
        if (!metadata) {
            return undefined
        }

        for (const key of keys) {
            const value = metadata[key]
            if (typeof value === 'string') {
                return value
            }
            if (Array.isArray(value) && value.length > 0) {
                const first = value[0]
                if (typeof first === 'string') {
                    return first
                }
            }
        }

        return undefined
    }

    private toOutcome(options: {
        eventId: string
        entityRef: string
        changeType: CatalogEntityChangeNotification['changeType']
        status: NotificationProcessingStatus
        reason?: string
        delivery: QueueDeliveryContext
    }): NotificationProcessingOutcome {
        return {
            eventId: options.eventId,
            entityRef: options.entityRef,
            changeType: options.changeType,
            status: options.status,
            reason: options.reason,
            attemptCount: options.delivery.approximateReceiveCount,
            processedAt: new Date().toISOString(),
            delivery: options.delivery,
        }
    }

    private failureStatus(attemptCount: number): NotificationProcessingStatus {
        if (attemptCount >= this.maxReceiveCount) {
            return 'dlq-routed'
        }

        return 'failed'
    }

    private eventIdFromPayload(payload: unknown): string {
        if (
            typeof payload === 'object'
            && payload !== null
            && typeof (payload as { eventId?: unknown }).eventId === 'string'
        ) {
            return (payload as { eventId: string }).eventId
        }
        return 'unknown'
    }

    private entityRefFromPayload(payload: unknown): string {
        if (
            typeof payload === 'object'
            && payload !== null
            && typeof (payload as { entityRef?: unknown }).entityRef === 'string'
        ) {
            return (payload as { entityRef: string }).entityRef
        }
        return 'unknown/unknown/unknown'
    }

    private rawChangeTypeFromPayload(payload: unknown): string | undefined {
        if (
            typeof payload === 'object'
            && payload !== null
            && typeof (payload as { changeType?: unknown }).changeType === 'string'
        ) {
            return (payload as { changeType: string }).changeType
        }

        return undefined
    }
}

import { LoggerService } from '@backstage/backend-plugin-api'
import { EventParams } from '@backstage/plugin-events-node'
import { validateNotificationPayload } from './notification-schema'
import { OutcomeLogger } from './outcome-logger'
import {
    CatalogEntityChangeNotification,
    NotificationProcessingOutcome,
    NotificationProcessingStatus,
    QueueDeliveryContext,
} from './types'

export interface EventProcessorOptions {
    logger: LoggerService
    topic: string
    dispatch: (notification: CatalogEntityChangeNotification) => Promise<void>
    outcomeLogger: OutcomeLogger
}

export class EventProcessor {
    private readonly logger: LoggerService
    private readonly topic: string
    private readonly dispatch: (notification: CatalogEntityChangeNotification) => Promise<void>
    private readonly outcomeLogger: OutcomeLogger

    constructor(options: EventProcessorOptions) {
        this.logger = options.logger.child({ target: 'serverlessops-catalog-event-processor' })
        this.topic = options.topic
        this.dispatch = options.dispatch
        this.outcomeLogger = options.outcomeLogger
    }

    async process(params: EventParams): Promise<NotificationProcessingOutcome | undefined> {
        if (params.topic !== this.topic) {
            this.logger.debug(`Skipping unexpected topic ${params.topic}`)
            return undefined
        }

        const delivery = this.getDeliveryContext(params.metadata)
        const validation = validateNotificationPayload(params.eventPayload)

        if (!validation.ok) {
            const outcome = this.toOutcome({
                eventId: this.eventIdFromPayload(params.eventPayload),
                entityRef: this.entityRefFromPayload(params.eventPayload),
                changeType: 'create',
                status: 'rejected',
                reason: validation.reason,
                delivery,
            })
            this.outcomeLogger.record(outcome)
            return outcome
        }

        try {
            await this.dispatch(validation.value)

            const outcome = this.toOutcome({
                eventId: validation.value.eventId,
                entityRef: validation.value.entityRef,
                changeType: validation.value.changeType,
                status: 'applied',
                delivery,
            })
            this.outcomeLogger.record(outcome)
            return outcome
        } catch (error) {
            const reason = error instanceof Error ? error.message : 'unknown processing error'
            const outcome = this.toOutcome({
                eventId: validation.value.eventId,
                entityRef: validation.value.entityRef,
                changeType: validation.value.changeType,
                status: 'failed',
                reason,
                delivery,
            })
            this.outcomeLogger.record(outcome)
            return outcome
        }
    }

    private getDeliveryContext(metadata?: Record<string, string | string[] | undefined>): QueueDeliveryContext {
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

    private eventIdFromPayload(payload: unknown): string {
        if (typeof payload === 'object' && payload !== null && typeof (payload as { eventId?: unknown }).eventId === 'string') {
            return (payload as { eventId: string }).eventId
        }
        return 'unknown'
    }

    private entityRefFromPayload(payload: unknown): string {
        if (typeof payload === 'object' && payload !== null && typeof (payload as { entityRef?: unknown }).entityRef === 'string') {
            return (payload as { entityRef: string }).entityRef
        }
        return 'unknown/unknown/unknown'
    }
}

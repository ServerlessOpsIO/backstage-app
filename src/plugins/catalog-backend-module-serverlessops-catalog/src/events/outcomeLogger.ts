import { LoggerService } from '@backstage/backend-plugin-api'
import { NotificationProcessingOutcome } from './types'

export class OutcomeLogger {
    private readonly logger: LoggerService

    constructor(logger: LoggerService) {
        this.logger = logger.child({ target: 'serverlessops-catalog-events' })
    }

    record(outcome: NotificationProcessingOutcome): void {
        const message = `Catalog event outcome=${outcome.status} changeType=${outcome.changeType} entityRef=${outcome.entityRef} eventId=${outcome.eventId}`
        const context = {
            eventId: outcome.eventId,
            entityRef: outcome.entityRef,
            changeType: outcome.changeType,
            status: outcome.status,
            reason: outcome.reason,
            attemptCount: outcome.attemptCount,
            delivery: { ...outcome.delivery },
            processedAt: outcome.processedAt,
        }

        switch (outcome.status) {
            case 'applied':
                this.logger.info(message, context)
                return
            case 'rejected':
                this.logger.warn(message, context)
                return
            case 'failed':
            case 'dlq-routed':
                this.logger.error(message, context)
                return
            default: {
                const neverStatus: never = outcome.status
                this.logger.warn(
                    `Unknown catalog event outcome status: ${neverStatus}`,
                    context
                )
            }
        }
    }
}

/***/
/**
 * The serverlessops-catalog backend module for the catalog plugin.
 *
 * @packageDocumentation
 */

export { catalogModuleServerlessopsCatalog as default } from './module'

export { type ProviderConfig } from './provider/ServerlessOpsCatalogProvider'
export {
    DUPLICATE_EVENT_REASON,
    EventProcessor,
    UNSUPPORTED_CHANGE_TYPE_REASON,
    type EventProcessorHandlers,
    type EventProcessorOptions,
} from './events/event-processor'
export { validateNotificationPayload } from './events/notification-schema'
export { OutcomeLogger } from './events/outcome-logger'
export { ProcessedEventCache } from './events/processed-event-cache'
export {
    type CatalogEntityChangeNotification,
    type CatalogEntityChangeType,
    type NotificationProcessingOutcome,
    type NotificationProcessingStatus,
    type NotificationValidationResult,
    type QueueDeliveryContext,
} from './events/types'
export { getJwt, isJwtExpired } from './util/jwt'

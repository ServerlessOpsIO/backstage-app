import { CatalogEntityChangeNotification, NotificationValidationResult } from './types'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null
}

export function validateNotificationPayload(payload: unknown): NotificationValidationResult {
    if (!isRecord(payload)) {
        return { ok: false, reason: 'payload must be an object' }
    }

    const eventId = payload.eventId
    const changeType = payload.changeType
    const entityRef = payload.entityRef
    const entity = payload.entity

    if (typeof eventId !== 'string' || eventId.trim().length === 0) {
        return { ok: false, reason: 'eventId is required' }
    }

    if (typeof changeType !== 'string') {
        return { ok: false, reason: 'changeType is required' }
    }

    if (typeof entityRef !== 'string' || entityRef.trim().length === 0) {
        return { ok: false, reason: 'entityRef is required' }
    }

    if (!isRecord(entity)) {
        return { ok: false, reason: 'entity is required' }
    }

    return {
        ok: true,
        value: payload as CatalogEntityChangeNotification,
    }
}

import { CatalogEntityChangeNotification, NotificationValidationResult } from './types'

const ENTITY_REF_PATTERN = /^[^/]+\/[^/]+\/[^/]+$/

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

export function validateNotificationPayload(payload: unknown): NotificationValidationResult {
    if (!isRecord(payload)) {
        return { ok: false, reason: 'unknown changeType or missing required fields is a processing failure and must be retried/then DLQ-routed' }
    }

    if (!isNonEmptyString(payload.eventId)) {
        return { ok: false, reason: 'eventId minLength: 1' }
    }

    if (!isNonEmptyString(payload.changeType)) {
        return { ok: false, reason: 'unknown changeType or missing required fields is a processing failure and must be retried/then DLQ-routed' }
    }

    if (!['create', 'update', 'delete'].includes(payload.changeType)) {
        return { ok: false, reason: 'changeType must be one of the three supported values' }
    }

    if (!isNonEmptyString(payload.entityRef)) {
        return { ok: false, reason: 'entityRef must be non-empty and match provider entity identity constraints' }
    }

    if (!ENTITY_REF_PATTERN.test(payload.entityRef)) {
        return { ok: false, reason: 'entityRef pattern: ^[^/]+/[^/]+/[^/]+$' }
    }

    if (!isRecord(payload.entity)) {
        return { ok: false, reason: 'unknown changeType or missing required fields is a processing failure and must be retried/then DLQ-routed' }
    }

    if (!isNonEmptyString(payload.entity.apiVersion)) {
        return { ok: false, reason: 'entity must include apiVersion, kind, and metadata.name' }
    }

    if (!isNonEmptyString(payload.entity.kind)) {
        return { ok: false, reason: 'entity must include apiVersion, kind, and metadata.name' }
    }

    if (!isRecord(payload.entity.metadata) || !isNonEmptyString(payload.entity.metadata.name)) {
        return { ok: false, reason: 'entity must include apiVersion, kind, and metadata.name' }
    }

    return {
        ok: true,
        value: payload as unknown as CatalogEntityChangeNotification,
    }
}

import type { AttributeValue } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import type { Entity } from '@backstage/catalog-model'
import { CatalogEntityChangeNotification, NotificationValidationResult } from './types'

const ENTITY_REF_PATTERN = /^[^/]+\/[^/]+\/[^/]+$/
const ENTITY_VALIDATION_REASON = 'entity must include apiVersion, kind, and metadata.name'
const REQUIRED_FIELDS_REASON =
    'unknown changeType or missing required fields is a processing failure and must be retried/then DLQ-routed'

type UnknownRecord = Record<string, unknown>
type ValidatedNotification = UnknownRecord & {
    eventId: string
    changeType: CatalogEntityChangeNotification['changeType']
    entityRef: string
}
type DynamoDbEntityImage = Record<string, AttributeValue> & {
    pk: { S: string }
    sk: { S: string }
    itemType: { S: 'entity' }
}

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

function isAttributeValue(value: unknown): value is AttributeValue {
    if (!isRecord(value) || Object.keys(value).length !== 1) {
        return false
    }

    if ('S' in value || 'N' in value) {
        return typeof (value.S ?? value.N) === 'string'
    }
    if ('BOOL' in value) {
        return typeof value.BOOL === 'boolean'
    }
    if ('NULL' in value) {
        return value.NULL === true
    }
    if ('M' in value) {
        return isRecord(value.M) && Object.values(value.M).every(isAttributeValue)
    }
    if ('L' in value) {
        return Array.isArray(value.L) && value.L.every(isAttributeValue)
    }
    if ('SS' in value || 'NS' in value) {
        const values = value.SS ?? value.NS
        return Array.isArray(values) && values.every(item => typeof item === 'string')
    }

    return false
}

function isDynamoDbEntityImage(value: unknown): value is DynamoDbEntityImage {
    return (
        isRecord(value)
        && Object.values(value).every(isAttributeValue)
        && isRecord(value.pk)
        && isNonEmptyString(value.pk.S)
        && isRecord(value.sk)
        && isNonEmptyString(value.sk.S)
        && isRecord(value.itemType)
        && value.itemType.S === 'entity'
    )
}

function isLegacyEntity(value: UnknownRecord): value is Entity {
    return (
        isNonEmptyString(value.apiVersion)
        && isNonEmptyString(value.kind)
        && isRecord(value.metadata)
        && isNonEmptyString(value.metadata.name)
    )
}

function isChangeType(value: string): value is CatalogEntityChangeNotification['changeType'] {
    return ['create', 'update', 'delete'].includes(value)
}

function createNotification(
    payload: ValidatedNotification,
    entity: Entity,
): CatalogEntityChangeNotification {
    return {
        eventId: payload.eventId,
        changeType: payload.changeType,
        entityRef: payload.entityRef,
        entity,
        ...(typeof payload.source === 'string' ? { source: payload.source } : {}),
        ...(typeof payload.occurredAt === 'string' ? { occurredAt: payload.occurredAt } : {}),
        ...(typeof payload.schemaVersion === 'string'
            ? { schemaVersion: payload.schemaVersion }
            : {}),
    }
}

function normalizeDynamoDbEntityImage(
    payload: ValidatedNotification,
): NotificationValidationResult {
    if (!isDynamoDbEntityImage(payload.entity)) {
        return { ok: false, reason: ENTITY_VALIDATION_REASON }
    }

    if (payload.entity.sk.S !== payload.entityRef) {
        return { ok: false, reason: 'entityRef must match the persisted entity sort key' }
    }

    const entity = unmarshall(payload.entity)
    delete entity.pk
    delete entity.sk
    delete entity.itemType

    if (!isLegacyEntity(entity)) {
        return { ok: false, reason: ENTITY_VALIDATION_REASON }
    }

    const namespace = entity.metadata.namespace
    const expectedEntityRef =
        `${typeof namespace === 'string' && namespace ? namespace : 'default'}/` +
        `${String(entity.kind).toLowerCase()}/${String(entity.metadata.name)}`
    if (!ENTITY_REF_PATTERN.test(expectedEntityRef) || expectedEntityRef !== payload.entityRef) {
        return { ok: false, reason: 'entityRef must match the persisted entity identity' }
    }

    return {
        ok: true,
        value: createNotification(payload, entity),
    }
}

export function validateNotificationPayload(payload: unknown): NotificationValidationResult {
    if (!isRecord(payload)) {
        return { ok: false, reason: REQUIRED_FIELDS_REASON }
    }

    if (!isNonEmptyString(payload.eventId)) {
        return { ok: false, reason: 'eventId minLength: 1' }
    }

    if (!isNonEmptyString(payload.changeType)) {
        return { ok: false, reason: REQUIRED_FIELDS_REASON }
    }

    if (!isChangeType(payload.changeType)) {
        return { ok: false, reason: 'changeType must be one of the three supported values' }
    }

    if (!isNonEmptyString(payload.entityRef)) {
        return { ok: false, reason: 'entityRef must be non-empty and match provider entity identity constraints' }
    }

    if (!ENTITY_REF_PATTERN.test(payload.entityRef)) {
        return { ok: false, reason: 'entityRef pattern: ^[^/]+/[^/]+/[^/]+$' }
    }

    const validatedPayload: ValidatedNotification = {
        ...payload,
        eventId: payload.eventId,
        changeType: payload.changeType,
        entityRef: payload.entityRef,
    }

    if (!isRecord(payload.entity)) {
        return { ok: false, reason: REQUIRED_FIELDS_REASON }
    }

    if ('pk' in payload.entity || 'sk' in payload.entity || 'itemType' in payload.entity) {
        return normalizeDynamoDbEntityImage(validatedPayload)
    }

    if (!isLegacyEntity(payload.entity)) {
        return { ok: false, reason: ENTITY_VALIDATION_REASON }
    }

    return {
        ok: true,
        value: createNotification(validatedPayload, payload.entity),
    }
}

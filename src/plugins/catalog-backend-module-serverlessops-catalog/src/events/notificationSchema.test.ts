import { validateNotificationPayload } from './notificationSchema'

function createImagePayload() {
    return {
        eventId: 'evt-create-1',
        changeType: 'create',
        entityRef: 'default/component/test-component',
        entity: {
            pk: { S: 'default/component' },
            sk: { S: 'default/component/test-component' },
            itemType: { S: 'entity' },
            apiVersion: { S: 'backstage.io/v1alpha1' },
            kind: { S: 'Component' },
            metadata: {
                M: {
                    name: { S: 'test-component' },
                    namespace: { S: 'default' },
                },
            },
            spec: {
                M: {
                    type: { S: 'service' },
                    owner: { S: 'team-a' },
                },
            },
        },
    }
}

describe('validateNotificationPayload', () => {
    it('unmarshals DynamoDB stream images and removes table-only fields', () => {
        const result = validateNotificationPayload(createImagePayload())

        expect(result.ok).toBe(true)
        if (!result.ok) {
            return
        }

        expect(result.value.entity).toEqual({
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'Component',
            metadata: {
                name: 'test-component',
                namespace: 'default',
            },
            spec: {
                type: 'service',
                owner: 'team-a',
            },
        })
        expect(result.value.entity).not.toHaveProperty('pk')
        expect(result.value.entity).not.toHaveProperty('sk')
        expect(result.value.entity).not.toHaveProperty('itemType')
    })

    it('rejects a DynamoDB image whose persisted identity differs from entityRef', () => {
        const payload = createImagePayload()
        payload.entity.sk.S = 'default/component/other-component'

        expect(validateNotificationPayload(payload)).toEqual({
            ok: false,
            reason: 'entityRef must match the persisted entity sort key',
        })
    })

    it('rejects a DynamoDB image without metadata.name', () => {
        const payload = createImagePayload()
        Reflect.deleteProperty(payload.entity.metadata.M, 'name')

        expect(validateNotificationPayload(payload)).toEqual({
            ok: false,
            reason: 'entity must include apiVersion, kind, and metadata.name',
        })
    })

    it('continues to accept legacy Backstage entity notifications', () => {
        const payload = createImagePayload()
        const legacyPayload = {
            ...payload,
            entity: {
                apiVersion: 'backstage.io/v1alpha1',
                kind: 'Component',
                metadata: { name: 'test-component' },
            },
        }

        expect(validateNotificationPayload(legacyPayload)).toEqual({
            ok: true,
            value: legacyPayload,
        })
    })
})

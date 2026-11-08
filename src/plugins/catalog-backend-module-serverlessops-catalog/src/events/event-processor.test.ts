import { mockServices } from '@backstage/backend-test-utils'
import {
    EventProcessor,
    DUPLICATE_EVENT_REASON,
    UNSUPPORTED_CHANGE_TYPE_REASON,
} from './event-processor'
import { OutcomeLogger } from './outcome-logger'

function createPayload(changeType: 'create' | 'update' | 'delete') {
    return {
        eventId: `evt-${changeType}-1`,
        changeType,
        entityRef: 'default/component/test-component',
        entity: {
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'Component',
            metadata: { name: 'test-component' },
        },
    }
}

function createProcessor(handlers: {
    create?: jest.Mock
    update?: jest.Mock
    delete?: jest.Mock
} = {}) {
    const outcomeLogger = new OutcomeLogger(mockServices.rootLogger())
    const outcomeSpy = jest.spyOn(outcomeLogger, 'record')
    const create = handlers.create ?? jest.fn().mockResolvedValue(undefined)
    const update = handlers.update ?? jest.fn().mockResolvedValue(undefined)
    const remove = handlers.delete ?? jest.fn().mockResolvedValue(undefined)
    const processor = new EventProcessor({
        logger: mockServices.rootLogger(),
        topic: 'serverlessops.catalog',
        handlers: {
            create,
            update,
            delete: remove,
        },
        outcomeLogger,
    })

    return { processor, outcomeSpy, create, update, remove }
}

describe('EventProcessor', () => {
    describe('should succeed when', () => {
        test('create notifications are routed into create handler', async () => {
            const { processor, outcomeSpy, create, update, remove } = createProcessor()
            const payload = createPayload('create')

            const outcome = await processor.process({
                topic: 'serverlessops.catalog',
                eventPayload: payload,
                metadata: {
                    messageId: 'message-1',
                    approximateReceiveCount: '1',
                },
            })

            expect(create).toHaveBeenCalledWith(payload)
            expect(update).not.toHaveBeenCalled()
            expect(remove).not.toHaveBeenCalled()
            expect(outcome).toEqual(
                expect.objectContaining({
                    eventId: 'evt-create-1',
                    changeType: 'create',
                    status: 'applied',
                })
            )
            expect(outcomeSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventId: 'evt-create-1',
                    status: 'applied',
                })
            )
        })
    })

    describe('should fail when', () => {
        test('duplicate event id is rejected with deterministic reason', async () => {
            const { processor, create } = createProcessor()
            const payload = createPayload('create')
            const params = {
                topic: 'serverlessops.catalog',
                eventPayload: payload,
                metadata: {
                    approximateReceiveCount: '1',
                },
            }

            const firstOutcome = await processor.process(params)
            const duplicateOutcome = await processor.process(params)

            expect(create).toHaveBeenCalledTimes(1)
            expect(firstOutcome).toEqual(expect.objectContaining({ status: 'applied' }))
            expect(duplicateOutcome).toEqual(
                expect.objectContaining({
                    status: 'rejected',
                    reason: DUPLICATE_EVENT_REASON,
                })
            )
        })

        test('unsupported changeType is rejected with deterministic reason', async () => {
            const { processor, create, update, remove } = createProcessor()
            const outcome = await processor.process({
                topic: 'serverlessops.catalog',
                eventPayload: {
                    ...createPayload('create'),
                    changeType: 'archive',
                },
            })

            expect(create).not.toHaveBeenCalled()
            expect(update).not.toHaveBeenCalled()
            expect(remove).not.toHaveBeenCalled()
            expect(outcome).toEqual(
                expect.objectContaining({
                    status: 'rejected',
                    reason: UNSUPPORTED_CHANGE_TYPE_REASON,
                })
            )
        })
    })
})

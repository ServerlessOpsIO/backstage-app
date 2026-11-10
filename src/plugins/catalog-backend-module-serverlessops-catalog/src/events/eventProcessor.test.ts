import { mockServices } from '@backstage/backend-test-utils'
import {
    EventProcessor,
    DUPLICATE_EVENT_REASON,
    UNSUPPORTED_CHANGE_TYPE_REASON,
    MessageLogLevel,
    parseMessageLogLevel,
} from './eventProcessor'
import { OutcomeLogger } from './outcomeLogger'

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
} = {}, maxReceiveCount = 3) {
    const outcomeLogger = new OutcomeLogger(mockServices.rootLogger())
    const outcomeSpy = jest.spyOn(outcomeLogger, 'record')
    const create = handlers.create ?? jest.fn().mockResolvedValue(undefined)
    const update = handlers.update ?? jest.fn().mockResolvedValue(undefined)
    const remove = handlers.delete ?? jest.fn().mockResolvedValue(undefined)
    const processor = new EventProcessor({
        logger: mockServices.rootLogger(),
        topic: 'ServerlessOpsCatalog',
        handlers: {
            create,
            update,
            delete: remove,
        },
        maxReceiveCount,
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
                topic: 'ServerlessOpsCatalog',
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

        test.each<[MessageLogLevel | undefined, MessageLogLevel]>([
            [undefined, 'debug'],
            ['debug', 'debug'],
            ['info', 'info'],
        ])('received messages are logged with messageLogLevel=%s at %s, including invalid payloads', async (
            messageLogLevel,
            expectedLevel,
        ) => {
            const logger = {
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                child: jest.fn(),
            }
            logger.child.mockReturnValue(logger)
            const processor = new EventProcessor({
                logger,
                topic: 'ServerlessOpsCatalog',
                handlers: {
                    create: jest.fn().mockResolvedValue(undefined),
                    update: jest.fn().mockResolvedValue(undefined),
                    delete: jest.fn().mockResolvedValue(undefined),
                },
                outcomeLogger: new OutcomeLogger(mockServices.rootLogger()),
                messageLogLevel,
            })
            const invalidPayload = { eventId: 'evt-bad-1', entityRef: 'default/component/x' }

            await processor.process({
                topic: 'ServerlessOpsCatalog',
                eventPayload: invalidPayload,
                metadata: {
                    messageId: 'message-9',
                    messageGroupId: 'default/component/x',
                    approximateReceiveCount: '2',
                },
            })

            const otherLevel = expectedLevel === 'debug' ? 'info' : 'debug'
            expect(logger[otherLevel]).not.toHaveBeenCalled()
            expect(logger[expectedLevel]).toHaveBeenCalledTimes(1)
            expect(logger[expectedLevel]).toHaveBeenCalledWith(
                'Received catalog event message messageId=message-9',
                {
                    topic: 'ServerlessOpsCatalog',
                    messageId: 'message-9',
                    messageGroupId: 'default/component/x',
                    messageDeduplicationId: undefined,
                    approximateReceiveCount: 2,
                    eventPayload: JSON.stringify(invalidPayload),
                },
            )
        })

        test('message log level config values are parsed', () => {
            expect(parseMessageLogLevel(undefined)).toBe('debug')
            expect(parseMessageLogLevel('')).toBe('debug')
            expect(parseMessageLogLevel('debug')).toBe('debug')
            expect(parseMessageLogLevel('info')).toBe('info')
            expect(() => parseMessageLogLevel('verbose')).toThrow(
                'Invalid events.messageLogLevel "verbose"; expected one of debug, info'
            )
        })
    })

    describe('should fail when', () => {
        test('duplicate event id is rejected with deterministic reason', async () => {
            const { processor, create } = createProcessor()
            const payload = createPayload('create')
            const params = {
                topic: 'ServerlessOpsCatalog',
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
            const { processor, create, update, remove } = createProcessor({})
            const outcome = await processor.process({
                topic: 'ServerlessOpsCatalog',
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

        test('retry attempt accounting maps terminal failures to dlq-routed', async () => {
            const create = jest.fn().mockRejectedValue(new Error('forced failure'))
            const { processor } = createProcessor({ create }, 3)

            const retryOutcome = await processor.process({
                topic: 'ServerlessOpsCatalog',
                eventPayload: createPayload('create'),
                metadata: {
                    approximateReceiveCount: '2',
                },
            })
            const terminalOutcome = await processor.process({
                topic: 'ServerlessOpsCatalog',
                eventPayload: createPayload('create'),
                metadata: {
                    approximateReceiveCount: '3',
                },
            })

            expect(retryOutcome).toEqual(
                expect.objectContaining({
                    status: 'failed',
                    attemptCount: 2,
                })
            )
            expect(terminalOutcome).toEqual(
                expect.objectContaining({
                    status: 'dlq-routed',
                    attemptCount: 3,
                })
            )
        })

        test('a failed message does not block subsequent messages', async () => {
            const create = jest.fn()
                .mockRejectedValueOnce(new Error('first failure'))
                .mockResolvedValueOnce(undefined)
            const { processor } = createProcessor({ create })

            const firstOutcome = await processor.process({
                topic: 'ServerlessOpsCatalog',
                eventPayload: {
                    ...createPayload('create'),
                    eventId: 'evt-create-fail',
                },
                metadata: {
                    approximateReceiveCount: '1',
                },
            })
            const secondOutcome = await processor.process({
                topic: 'ServerlessOpsCatalog',
                eventPayload: {
                    ...createPayload('create'),
                    eventId: 'evt-create-next',
                },
                metadata: {
                    approximateReceiveCount: '1',
                },
            })

            expect(create).toHaveBeenCalledTimes(2)
            expect(firstOutcome).toEqual(
                expect.objectContaining({
                    eventId: 'evt-create-fail',
                    status: 'failed',
                })
            )
            expect(secondOutcome).toEqual(
                expect.objectContaining({
                    eventId: 'evt-create-next',
                    status: 'applied',
                })
            )
        })
    })
})

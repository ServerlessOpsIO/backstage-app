import { mockServices } from '@backstage/backend-test-utils'
import { EventProcessor } from './event-processor'
import { OutcomeLogger } from './outcome-logger'

describe('EventProcessor', () => {
    describe('should succeed when', () => {
        test('create notifications are routed into dispatch handler', async () => {
            const dispatch = jest.fn().mockResolvedValue(undefined)
            const outcomeLogger = new OutcomeLogger(mockServices.rootLogger())
            const outcomeSpy = jest.spyOn(outcomeLogger, 'record')
            const processor = new EventProcessor({
                logger: mockServices.rootLogger(),
                topic: 'serverlessops.catalog',
                dispatch,
                outcomeLogger,
            })

            const payload = {
                eventId: 'evt-create-1',
                changeType: 'create',
                entityRef: 'default/component/test-component',
                entity: {
                    apiVersion: 'backstage.io/v1alpha1',
                    kind: 'Component',
                    metadata: { name: 'test-component' },
                },
            }

            const outcome = await processor.process({
                topic: 'serverlessops.catalog',
                eventPayload: payload,
                metadata: {
                    messageId: 'message-1',
                    approximateReceiveCount: '1',
                },
            })

            expect(dispatch).toHaveBeenCalledWith(payload)
            expect(outcome).toEqual(
                expect.objectContaining({
                    eventId: 'evt-create-1',
                    changeType: 'create',
                    entityRef: 'default/component/test-component',
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
})

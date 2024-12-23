import { mockServices } from '@backstage/backend-test-utils'
import { GoogleGroupProvider, SCOPES } from './GoogleGroupProvider'
import * as creds from '../../../../jwt.keys.json'

describe('GoogleGroupProvider', () => {
    let mockConfig: any
    let provider: GoogleGroupProvider
    let mockConnection: any
    let mockTaskRunner: any

    beforeEach(() => {
        mockConnection = {
            applyMutation: jest.fn()
        }
        mockTaskRunner = {
            run: jest.fn()
        }

        mockConfig = {
            auth: {
                adminAccountEmail: "tom@serverlessops.io",
                clientCredentials: creds
            },
            schedule: {
                initialDelay: { seconds: 5 },
                frequency: { minutes: 1 },
                timeout: { seconds: 30 },
            }
        }

        provider = new GoogleGroupProvider(
            mockConfig,
            {
                logger: mockServices.rootLogger(),
                taskRunner: mockTaskRunner
            }
        )
    })

    describe('getProviderName()', () => {
        describe('should succeed', () => {
            test('provider name', () => {
                expect(provider.getProviderName()).toBe('google-group')
            })
        })
    })

    describe('getCredentials()', () => {
        describe('should succeed', () => {
            test('when getting JWT', () => {
                const credentials = provider.getCredentials(
                    mockConfig.auth.adminAccountEmail,
                    mockConfig.auth.clientCredentials,
                    SCOPES
                )
                expect(credentials).toBeDefined()
            })
        })
    })

    describe('listGroups()', () => {
        describe('should succeed', () => {
            test('when listing groups', async () => {
                const credentials = provider.getCredentials(
                    mockConfig.auth.adminAccountEmail,
                    mockConfig.auth.clientCredentials,
                    SCOPES
                )
                const groups = await provider.listGroups(credentials)
                expect(groups.length).toBeGreaterThan(0)
            }, 20 * 1000)
        })
    })

    describe('connect()', () => {
        describe('should succeed when', () => {
            test('connects and runs successfully', async () => {
                await provider.connect(mockConnection)
                expect(mockTaskRunner.run).toHaveBeenCalled()
            })
        })
    })

    describe('run()', () => {
        describe('should succeed when', () => {
            test('runs successfully', async () => {
                await provider.connect(mockConnection)
                await provider.run()
                expect(mockConnection.applyMutation).toHaveBeenCalled()
            }, 20 * 1000)
        })
    })
})
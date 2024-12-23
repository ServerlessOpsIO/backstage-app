import { mockServices } from '@backstage/backend-test-utils'
import { GoogleUserProvider } from './GoogleUserProvider'
import * as creds from '../../../../jwt.keys.json'

describe('GoogleUserProvider', () => {
    let mockConfig: any
    let provider: GoogleUserProvider
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

        provider = new GoogleUserProvider(
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
                expect(provider.getProviderName()).toBe('google-user')
            })
        })
    })

    describe('getCredentials()', () => {
        describe('should succeed', () => {
            test('when getting JWT', () => {
                const credentials = provider.getCredentials(
                    mockConfig.auth.adminAccountEmail,
                    mockConfig.auth.clientCredentials,
                    [ 'https://www.googleapis.com/auth/admin.directory.user.readonly']
                )
                expect(credentials).toBeDefined()
            })
        })
    })

    describe('listUsers()', () => {
        describe('should succeed', () => {
            test('when listing users', async () => {
                const credentials = provider.getCredentials(
                    mockConfig.auth.adminAccountEmail,
                    mockConfig.auth.clientCredentials,
                    [ 'https://www.googleapis.com/auth/admin.directory.user.readonly']
                )
                const users = await provider.listUsers(credentials)
                expect(users.length).toBeGreaterThan(0)
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
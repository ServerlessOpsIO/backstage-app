import { mockServices } from '@backstage/backend-test-utils'
import { GoogleBaseProvider } from './GoogleBaseProvider'
import * as creds from '../../../../app-config.d/credentials/google-jwt.keys.json' /* eslint @backstage/no-relative-monorepo-imports: off */

describe('GoogleUserProvider', () => {
    let mockConfig: any
    let provider: GoogleBaseProvider
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

        provider = new GoogleBaseProvider(
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
                expect(provider.getProviderName()).toBe('google-base')
            })
        })
    })

    describe('getCredentials()', () => {
        describe('should succeed', () => {
            test('when getting JWT', () => {
                const credentials = provider.getCredentials(
                    mockConfig.auth.adminAccountEmail,
                    mockConfig.auth.clientCredentials,
                    []
                )
                expect(credentials).toBeDefined()
            })
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
                expect( async () => await provider.run()).not.toThrow()
            }, 10 * 1000)
        })
    })
})
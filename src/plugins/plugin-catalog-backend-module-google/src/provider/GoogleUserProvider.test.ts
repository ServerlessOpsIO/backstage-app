import { mockServices } from '@backstage/backend-test-utils'
import { GoogleUserProvider, SCOPES } from './GoogleUserProvider'
import { admin_directory_v1 } from 'googleapis'
import * as creds from '../../../../jwt.keys.json'

jest.mock('googleapis', () => {
    return {
        ...jest.requireActual('googleapis')
    }
})

describe('GoogleUserProvider', () => {
    let mockConfig: any
    let provider: GoogleUserProvider
    let mockConnection: any
    let mockTaskRunner: any

    beforeEach(() => {
        jest.resetAllMocks()

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
                    SCOPES
                )
                expect(credentials).toBeDefined()
            })
        })
    })

    describe('getUserGroups()', () => {
        describe('should succeed', () => {
            test('when listing users groups', async () => {
                const users = await provider.getUserGroups('tom@serverlessops.io')
                expect(users.length).toBeGreaterThan(0)
            }, 20 * 1000)

            test('when listing users groups with multiple pages of results', async () => {
                const mockListResponse = jest.fn()
                mockListResponse
                    .mockReturnValueOnce({ data: { groups: [{ id: '1' }], nextPageToken: 'next' } })
                    .mockReturnValueOnce({ data: { groups: [{ id: '2' }] } })
                const mockAdmin = jest.fn().mockReturnValue({
                    groups: {
                        list: mockListResponse
                    }
                })

                // Set page size to 1 to force multiple pages of results
                provider.providerConfig.pageSize = 1
                provider.googleAdmin = mockAdmin() as unknown as admin_directory_v1.Admin

                const users = await provider.getUserGroups('tom@serverlessops.io')
                expect(users.length).toEqual(2)
                expect(mockListResponse).toHaveBeenCalledTimes(2)
            }, 20 * 1000)
        })
    })

    describe('listUsers()', () => {
        describe('should succeed', () => {
            test('when listing users', async () => {
                const users = await provider.listUsers()
                expect(users.length).toBeGreaterThan(0)
            }, 20 * 1000)

            test('when listing users with multiple pages of results', async () => {
                const mockListResponse = jest.fn()
                mockListResponse
                    .mockReturnValueOnce({ data: { users: [{ id: '1' }], nextPageToken: 'next' } })
                    .mockReturnValueOnce({ data: { users: [{ id: '2' }] } })
                const mockAdmin = jest.fn().mockReturnValue({
                    users: {
                        list: mockListResponse
                    }
                })

                // Set page size to 1 to force multiple pages of results
                provider.providerConfig.pageSize = 1
                provider.googleAdmin = mockAdmin() as unknown as admin_directory_v1.Admin

                const users = await provider.listUsers()
                expect(users.length).toEqual(2)
                expect(mockListResponse).toHaveBeenCalledTimes(2)
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
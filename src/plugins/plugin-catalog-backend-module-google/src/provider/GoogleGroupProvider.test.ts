import { mockServices } from '@backstage/backend-test-utils'
import { GoogleGroupProvider, SCOPES } from './GoogleGroupProvider'
import { admin_directory_v1 } from 'googleapis'
import * as creds from '../../../../app-config.d/credentials/google-jwt.keys.json' /* eslint @backstage/no-relative-monorepo-imports: off */


jest.mock('googleapis', () => {
    return {
        ...jest.requireActual('googleapis')
    }
})

describe('GoogleGroupProvider', () => {
    let mockConfig: any
    let provider: GoogleGroupProvider
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
                const groups = await provider.listGroups()
                expect(groups.length).toBeGreaterThan(0)
            }, 20 * 1000)

            test('when listing groups with multiple pages of results', async () => {
                const mockListResponse = jest.fn()
                mockListResponse
                    .mockReturnValueOnce({ data: { groups: [{ id: '1' }], nextPageToken: 'next' }})
                    .mockReturnValueOnce({data: { groups: [{ id: '2' }]}})
                const mockAdmin = jest.fn().mockReturnValue({
                    groups: {
                        list: mockListResponse
                    }
                })

                // Set page size to 1 to force multiple pages of results
                provider.providerConfig.pageSize = 1
                provider.googleAdmin = mockAdmin() as unknown as admin_directory_v1.Admin

                const groups = await provider.listGroups()
                expect(groups.length).toEqual(2)
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
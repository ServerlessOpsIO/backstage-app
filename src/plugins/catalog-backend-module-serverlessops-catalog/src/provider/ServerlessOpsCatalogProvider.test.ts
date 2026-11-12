import { Entity } from '@backstage/catalog-model'
import { mockServices } from '@backstage/backend-test-utils'
import { EntityProviderConnection } from '@backstage/plugin-catalog-node'
import axios from 'axios'
import { ProcessedEventCache } from '../events/processedEventCache'
import { getJwt, isJwtExpired } from '../util/jwt'
import { ServerlessOpsCatalogProvider } from './ServerlessOpsCatalogProvider'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

jest.mock('../util/jwt')
const mockGetJwt = getJwt as jest.MockedFunction<typeof getJwt>
const mockIsJwtExpired = isJwtExpired as jest.MockedFunction<typeof isJwtExpired>

const mockTaskRunner = {
    run: jest.fn(),
}

const mockConfig = {
    baseUrl: 'http://api.example.com',
    namespace: 'default',
    entityKinds: ['Component'],
    auth: {
        endpoint: 'http://auth.example.com',
        clientId: 'test-client',
        clientSecret: 'test-secret'
    },
    events: {
        topic: 'ServerlessOpsCatalog',
        maxReceiveCount: 3
    },
    schedule: {
        initialDelay: { seconds: 0 },
        frequency: { hours: 1 },
        timeout: { seconds: 60 }
    }
}

const mockOptions = {
    logger: mockServices.rootLogger(),
    taskRunner: mockTaskRunner
}

function createCreateNotification() {
    return {
        eventId: 'evt-create-1',
        changeType: 'create' as const,
        entityRef: 'default/component/test-component',
        entity: {
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'Component',
            metadata: { name: 'test-component' }
        }
    }
}

describe('ServerlessOpsCatalogProvider', () => {
    let provider: ServerlessOpsCatalogProvider
    let mockConnection: EntityProviderConnection

    beforeEach(() => {
        provider = new ServerlessOpsCatalogProvider(mockConfig, mockOptions)
        mockConnection = {
            ...jest.requireActual('@backstage/plugin-catalog-node').EntityProviderConnection,
            applyMutation: jest.fn(),
            refresh: jest.fn()
        }
        mockGetJwt.mockResolvedValue('test-token')
        mockIsJwtExpired.mockReturnValue(false)
        mockTaskRunner.run.mockResolvedValue(undefined)
    })

    afterEach(() => {
        jest.resetAllMocks()
    })

    describe('getProviderName()', () => {
        test('provider name', () => {
            expect(provider.getProviderName()).toBe('serverlessops-catalog')
        })
    })

    describe('getEventProcessingConfig()', () => {
        test('event config exists', () => {
            expect(provider.getEventProcessingConfig()).toEqual({
                topic: 'ServerlessOpsCatalog',
                maxReceiveCount: 3
            })
        })
    })

    describe('connect()', () => {
        test('connects and runs successfully', async () => {
            await provider.connect(mockConnection)
            expect(mockTaskRunner.run).toHaveBeenCalled()
        })
    })

    describe('run()', () => {
        test('runs successfully', async () => {
            mockedAxios.get
                .mockResolvedValueOnce({
                    data: {
                        entities: ['default/component/test-component']
                    }
                })
                .mockResolvedValueOnce({
                    data: {
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Component',
                        metadata: { name: 'test-component' }
                    }
                })

            await provider.connect(mockConnection)
            await provider.run()

            const locationRef = 'url:http://api.example.com/catalog/default/component/test-component'
            expect(mockConnection.applyMutation).toHaveBeenCalledWith({
                type: 'full',
                entities: [
                    {
                        locationKey: locationRef,
                        entity: expect.objectContaining({
                            metadata: expect.objectContaining({
                                annotations: {
                                    'backstage.io/managed-by-location': locationRef,
                                    'backstage.io/managed-by-origin-location': locationRef
                                }
                            })
                        })
                    }
                ]
            })
        })
    })

    describe('processEventNotification()', () => {
        test('valid create notification is accepted', async () => {
            await provider.connect(mockConnection)
            await expect(
                provider.processEventNotification(createCreateNotification())
            ).resolves.toBeUndefined()
        })
    })

    describe('handleCreateNotification()', () => {
        test('create notification applies add mutation with managed-by annotations', async () => {
            await provider.connect(mockConnection)
            jest.clearAllMocks()

            await provider.handleCreateNotification(createCreateNotification())

            const locationRef = 'url:http://api.example.com/catalog/default/component/test-component'
            expect(mockConnection.applyMutation).toHaveBeenCalledWith({
                type: 'delta',
                added: [
                    {
                        locationKey: locationRef,
                        entity: expect.objectContaining({
                            metadata: expect.objectContaining({
                                annotations: {
                                    'backstage.io/managed-by-location': locationRef,
                                    'backstage.io/managed-by-origin-location': locationRef
                                }
                            })
                        })
                    }
                ],
                removed: []
            })
        })
    })

    describe('handleUpdateNotification()', () => {
        test('fetched entity is applied as delta add', async () => {
            await provider.connect(mockConnection)
            jest.clearAllMocks()

            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    apiVersion: 'backstage.io/v1alpha1',
                    kind: 'Component',
                    metadata: { name: 'fetched-component' }
                }
            })

            await provider.handleUpdateNotification({
                ...createCreateNotification(),
                eventId: 'evt-update-1',
                changeType: 'update',
                entity: {
                    apiVersion: 'backstage.io/v1alpha1',
                    kind: 'Component',
                    metadata: { name: 'payload-component' }
                }
            })

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'http://api.example.com/catalog/default/component/test-component',
                expect.objectContaining({
                    headers: { Authorization: 'Bearer test-token' }
                })
            )
            expect(mockConnection.applyMutation).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'delta',
                    added: [
                        expect.objectContaining({
                            entity: expect.objectContaining({
                                metadata: expect.objectContaining({
                                    name: 'fetched-component'
                                })
                            })
                        })
                    ]
                })
            )
        })

        test('payload entity is applied when fetch fails', async () => {
            await provider.connect(mockConnection)
            jest.clearAllMocks()
            mockedAxios.get.mockRejectedValueOnce(new Error('404 not found'))

            await provider.handleUpdateNotification({
                ...createCreateNotification(),
                eventId: 'evt-update-2',
                changeType: 'update',
                entity: {
                    apiVersion: 'backstage.io/v1alpha1',
                    kind: 'Component',
                    metadata: { name: 'payload-component' }
                }
            })

            expect(mockConnection.applyMutation).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'delta',
                    added: [
                        expect.objectContaining({
                            entity: expect.objectContaining({
                                metadata: expect.objectContaining({
                                    name: 'payload-component'
                                })
                            })
                        })
                    ]
                })
            )
        })
    })

    describe('handleDeleteNotification()', () => {
        test('remove mutation uses provider-managed entity semantics', async () => {
            await provider.connect(mockConnection)
            jest.clearAllMocks()

            await provider.handleDeleteNotification({
                ...createCreateNotification(),
                eventId: 'evt-delete-1',
                changeType: 'delete'
            })

            expect(mockConnection.applyMutation).toHaveBeenCalledWith({
                type: 'delta',
                added: [],
                removed: [
                    {
                        entityRef: 'component:default/test-component',
                        locationKey: 'url:http://api.example.com/catalog/default/component/test-component'
                    }
                ]
            })
        })
    })

    describe('event idempotency cache', () => {
        test('duplicate event keys are detected', () => {
            const cache = new ProcessedEventCache()

            expect(cache.has('evt-1', 'default/component/test-component')).toBe(false)
            cache.markProcessed('evt-1', 'default/component/test-component')
            expect(cache.has('evt-1', 'default/component/test-component')).toBe(true)
        })
    })

    describe('getEntitiesByKind()', () => {
        test('fetches entities', async () => {
            const mockResponse = { data: { entities: ['entity1', 'entity2'] } }
            mockedAxios.get.mockResolvedValue(mockResponse)

            const result = await provider.getEntitiesByKind('Component', 'test-token')
            expect(result).toEqual(mockResponse.data)
            expect(axios.get).toHaveBeenCalledWith(
                'http://api.example.com/catalog/default/component',
                expect.objectContaining({
                    headers: { Authorization: 'Bearer test-token' }
                })
            )
        })

        test('fetches all pages', async () => {
            mockedAxios.get
                .mockResolvedValueOnce({ data: { entities: ['entity1', 'entity2'], nextToken: 'token1' } })
                .mockResolvedValueOnce({ data: { entities: [], nextToken: 'token2' } })
                .mockResolvedValueOnce({ data: { entities: ['entity3'] } })

            const result = await provider.getEntitiesByKind('Component', 'test-token')
            expect(result).toEqual({ entities: ['entity1', 'entity2', 'entity3'] })
            expect(mockedAxios.get).toHaveBeenCalledTimes(3)
            expect(mockedAxios.get.mock.calls[0][1]).not.toHaveProperty('params')
            expect(mockedAxios.get).toHaveBeenNthCalledWith(
                2,
                'http://api.example.com/catalog/default/component',
                expect.objectContaining({ params: { nextToken: 'token1' } })
            )
            expect(mockedAxios.get).toHaveBeenNthCalledWith(
                3,
                'http://api.example.com/catalog/default/component',
                expect.objectContaining({ params: { nextToken: 'token2' } })
            )
        })

        test('throws when API repeats nextToken', async () => {
            mockedAxios.get.mockResolvedValue({ data: { entities: ['entity1'], nextToken: 'token1' } })

            await expect(
                provider.getEntitiesByKind('Component', 'test-token')
            ).rejects.toThrow('API returned the same nextToken twice')
        })

        test('throws when fetch fails', async () => {
            mockedAxios.get.mockRejectedValue(new Error('Network error'))

            await expect(
                provider.getEntitiesByKind('Component', 'test-token')
            ).rejects.toThrow('Failed to get entities by kind')
        })
    })

    describe('getEntityByPath()', () => {
        test('fetches single entity', async () => {
            const mockEntity: Entity = {
                apiVersion: 'backstage.io/v1alpha1',
                kind: 'Component',
                metadata: { name: 'test-component' }
            }
            mockedAxios.get.mockResolvedValue({ data: mockEntity })

            const result = await provider.getEntityByPath('path/to/entity', 'test-token')
            expect(result).toEqual(mockEntity)
            expect(mockedAxios.get).toHaveBeenCalledWith(
                'http://api.example.com/catalog/path/to/entity',
                expect.objectContaining({
                    headers: { Authorization: 'Bearer test-token' }
                })
            )
        })

        test('handles fetch errors appropriately', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))

            await expect(
                provider.getEntityByPath('path/to/entity', 'test-token')
            ).rejects.toThrow('Failed to get entity at path/to/entity: Network error')
        })
    })
})

import { mockServices } from '@backstage/backend-test-utils'
import {
    EntityProviderConnection,
} from '@backstage/plugin-catalog-node'
import { Entity } from '@backstage/catalog-model'
import { ServerlessOpsCatalogProvider } from './ServerlessOpsCatalogProvider'
import mockFetch from "jest-fetch-mock"

const mockTaskRunner = {
    run: jest.fn()
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

describe('ServerlessOpsCatalogProvider', () => {
    let provider: ServerlessOpsCatalogProvider
    let mockConnection: EntityProviderConnection
    beforeEach(() => {
        provider = new ServerlessOpsCatalogProvider(mockConfig, mockOptions)
        mockConnection = {
            ...jest.requireActual('@backstage/plugin-catalog-node').EntityProviderConnection,
            applyMutation: jest.fn()
        }
        mockFetch.enableMocks()

    })

    afterEach(() => {
        mockFetch.resetMocks()
    })


    describe('getProviderName()', () => {
        describe('should succeed', () => {
            test('provider name', () => {
                expect(provider.getProviderName()).toBe('serverlessops-catalog')
            })
        })
    })

    describe('connect()', () => {
        describe('should succeed when', () => {
            test('connects and runs successfully', async () => {

                mockFetch
                    .mockResponseOnce( // JWT fetch
                        JSON.stringify({access_token: 'test-token' })
                    )
                    .mockResponseOnce( // getEntitiesByKind
                        JSON.stringify({ entities: ['entity1'] })
                    ) 
                    .mockResponseOnce( // getEntityByPath
                        JSON.stringify({
                            apiVersion: 'backstage.io/v1alpha1',
                            kind: 'Component',
                            metadata: { name: 'test-component' }
                        })
                    )

                await provider.connect(mockConnection)
                expect(mockTaskRunner.run).toHaveBeenCalled()
            })
        })
    })

    describe('run()', () => {
        describe('should succeed when', () => {
            test('runs successfully', async () => {
                mockFetch
                    .mockResponseOnce( // JWT fetch
                        JSON.stringify({ access_token: 'test-token' })
                    )
                    .mockResponseOnce( // getEntitiesByKind
                        JSON.stringify({ entities: ['entity1'] })
                    )
                    .mockResponseOnce( // getEntityByPath
                        JSON.stringify({
                            apiVersion: 'backstage.io/v1alpha1',
                            kind: 'Component',
                            metadata: { name: 'test-component' }
                        })
                    )

                await provider.connect(mockConnection)
                await provider.run()
                expect(mockConnection.applyMutation).toHaveBeenCalled()
            })
        })

    })

    describe('getEntitiesByKind()', () => {
        describe('should succeed when', () => {
            test('fetches entities', async () => {
                const mockResponse = { entities: ['entity1', 'entity2'] }
                mockFetch.mockResponse(JSON.stringify(mockResponse))

                const result = await provider.getEntitiesByKind('Component', 'test-token')
                expect(result).toEqual(mockResponse)
                expect(fetch).toHaveBeenCalledWith(
                    'http://api.example.com/catalog/default/component',
                    expect.objectContaining({
                        headers: { Authorization: 'Bearer test-token' }
                    })
                )
            })
        })
        describe('should fail when', () => {
            test('fetch fails', async () => {
                mockFetch.mockRejectedValueOnce(new Error('Network error'))

                await expect(
                    provider.getEntitiesByKind('Component', 'test-token')
                ).rejects.toThrow('Failed to get entities by kind')
            })
        })
    })

    describe('getEntityByPath()', () => {
        describe('should succeed when', () => {
            test('getEntityByPath fetches single entity', async () => {
                const mockEntity: Entity = {
                    apiVersion: 'backstage.io/v1alpha1',
                    kind: 'Component',
                    metadata: { name: 'test-component' }
                }
                mockFetch.mockResponse(JSON.stringify(mockEntity))

                const result = await provider.getEntityByPath('path/to/entity', 'test-token')
                expect(result).toEqual(mockEntity)
                expect(fetch).toHaveBeenCalledWith(
                    'http://api.example.com/catalog/path/to/entity',
                    expect.objectContaining({
                        headers: { Authorization: 'Bearer test-token' }
                    })
                )
            })
        })

        describe('should fail when', () => {
            test('handles fetch errors appropriately', async () => {
                mockFetch.mockRejectedValueOnce(new Error('Network error'))

                await expect(
                    provider.getEntityByPath('path/to/entity', 'test-token')
                ).rejects.toThrow('Failed to get entity by path')
            })
        })
    })
})

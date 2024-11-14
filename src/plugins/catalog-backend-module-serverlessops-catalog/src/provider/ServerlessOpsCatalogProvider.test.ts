import { mockServices } from '@backstage/backend-test-utils'
import {
    EntityProviderConnection,
} from '@backstage/plugin-catalog-node'
import { Entity } from '@backstage/catalog-model'
import axios from 'axios'
import { ServerlessOpsCatalogProvider } from './ServerlessOpsCatalogProvider'
import { getJwt, isJwtExpired } from '../util/jwt'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

jest.mock('../util/jwt')
const mockGetJwt = getJwt as jest.MockedFunction<typeof getJwt>
const mockIsJwtExpired = isJwtExpired as jest.MockedFunction<typeof isJwtExpired>

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
        mockGetJwt.mockResolvedValue('test-token')
        mockIsJwtExpired.mockReturnValue(false)
    })

    afterEach(() => {
        jest.resetAllMocks()
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

                mockedAxios.get
                    .mockResolvedValueOnce( // JWT fetch
                        JSON.stringify({access_token: 'test-token' })
                    )
                    .mockResolvedValueOnce( // getEntitiesByKind
                        JSON.stringify({ entities: ['entity1'] })
                    ) 
                    .mockResolvedValueOnce( // getEntityByPath
                        {
                            apiVersion: 'backstage.io/v1alpha1',
                            kind: 'Component',
                            metadata: { name: 'test-component' }
                        }
                    )

                await provider.connect(mockConnection)
                expect(mockTaskRunner.run).toHaveBeenCalled()
            })
        })
    })

    describe('run()', () => {
        describe('should succeed when', () => {
            test('runs successfully', async () => {
                mockedAxios.get
                    .mockResolvedValueOnce( // getEntitiesByKind
                        {data: { entities: ['entity1'] }}
                    )
                    .mockResolvedValueOnce( // getEntityByPath
                        {
                            data: {
                                    apiVersion: 'backstage.io/v1alpha1',
                                    kind: 'Component',
                                    metadata: { name: 'test-component' }
                            }
                        }
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
        })
        describe('should fail when', () => {
            test('fetch fails', async () => {
                mockedAxios.get.mockRejectedValue(new Error('Network error'))

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
        })

        describe('should fail when', () => {
            test('handles fetch errors appropriately', async () => {
                mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))

                await expect(
                    provider.getEntityByPath('path/to/entity', 'test-token')
                ).rejects.toThrow('Failed to get entity at path/to/entity: Network error')
            })
        })
    })
})

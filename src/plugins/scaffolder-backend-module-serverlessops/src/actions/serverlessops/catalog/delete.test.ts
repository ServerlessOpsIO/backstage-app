import { PassThrough } from 'stream'
import {
    getJwt,
    ProviderConfig
} from '@internal/backstage-plugin-catalog-backend-module-serverlessops-catalog'
import mockFetch from 'jest-fetch-mock'
import { AuthService } from '@backstage/backend-plugin-api'
import { CatalogApi } from '@backstage/catalog-client'

// Add mock before other imports
jest.mock('@internal/backstage-plugin-catalog-backend-module-serverlessops-catalog', () => ({
    ...jest.requireActual('@internal/backstage-plugin-catalog-backend-module-serverlessops-catalog'),
    getJwt: jest.fn()
}))

import { deleteServerlessOpsCatalogAction } from './delete'

describe('serverlessops:catalog:delete', () => {
    let config: ProviderConfig
    let mockAuth: jest.Mocked<AuthService>
    let mockCatalogClient: jest.Mocked<CatalogApi>

    beforeEach(() => {
        config = {
            baseUrl: 'https://example.com',
            auth: {
                endpoint: 'https://example.com/auth',
                clientId: 'test',
                clientSecret: 'test',
            }
        } as ProviderConfig

        mockAuth = {
            getPluginRequestToken: jest.fn().mockResolvedValue({ token: 'mock-token' })
        } as unknown as jest.Mocked<AuthService>

        mockCatalogClient = {
            getEntityByRef: jest.fn().mockResolvedValue({
                metadata: {
                    annotations: {
                        'backstage.io/managed-by-location': 'url:https://example.com/entity'
                    }
                }
            })
        } as unknown as jest.Mocked<CatalogApi>

        (getJwt as jest.Mock).mockResolvedValue('mock-jwt-token')

        mockFetch.enableMocks()
    })
    afterEach(() => {
        mockFetch.resetMocks()
        jest.resetAllMocks()
    })

    test('should call action', async () => {
        const action = deleteServerlessOpsCatalogAction(mockCatalogClient, mockAuth, config)

        const logger = { info: jest.fn() }

        mockFetch.mockResponse(JSON.stringify({}), { status: 200 })

        await action.handler({
            input: {
                entity: 'kind:namespace/name'
            },
            workspacePath: '/tmp',
            logger: logger as any,
            logStream: new PassThrough(),
            output: jest.fn(),
            createTemporaryDirectory() {
                throw new Error('Not implemented')
            },
            checkpoint() {
                throw new Error('Not implemented')
            },
            getInitiatorCredentials: () => Promise.resolve({
                    $$type: '@backstage/BackstageCredentials',
                    principal: 'unknown'
                }
            )
        })

        expect(getJwt).toHaveBeenCalled()
        expect(mockAuth.getPluginRequestToken).toHaveBeenCalled()
        expect(mockCatalogClient.getEntityByRef).toHaveBeenCalled()
    })
})

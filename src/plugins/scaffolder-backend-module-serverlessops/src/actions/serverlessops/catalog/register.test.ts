import { PassThrough } from 'stream'
import { CatalogApi } from '@backstage/catalog-client'
import { AuthService } from '@backstage/backend-plugin-api'
import { registerServerlessOpsCatalogAction } from './register'

describe('serverlessops:catalog:register', () => {
    let catalogClient: jest.Mocked<CatalogApi>
    let auth: jest.Mocked<AuthService>

    beforeEach(() => {
        catalogClient = {
            addLocation: jest.fn()
        } as unknown as jest.Mocked<CatalogApi>

        auth = {
            getPluginRequestToken: jest.fn()
        } as unknown as jest.Mocked<AuthService>
    })

    afterEach(() => {
        jest.resetAllMocks()
    })

    test('should register location without auth', async () => {
        const action = registerServerlessOpsCatalogAction(catalogClient)
        const logger = { info: jest.fn() }

        await action.handler({
            input: {
                catalogInfoUrl: 'https://example.com/catalog-info.yaml'
            },
            workspacePath: '/tmp',
            logger: logger as any,
            logStream: new PassThrough(),
            output: jest.fn(),
            secrets: {
                backstageToken: 'test-token'
            },
            createTemporaryDirectory() {
                throw new Error('Not implemented')
            },
            checkpoint() {
                throw new Error('Not implemented')
            },
            getInitiatorCredentials() {
                throw new Error('Not implemented')
            }
        })

        expect(catalogClient.addLocation).toHaveBeenCalledWith(
            {
                type: 'url',
                target: 'https://example.com/catalog-info.yaml'
            },
            {
                token: 'test-token'
            }
        )
    })

    test('should register location with auth', async () => {
        const action = registerServerlessOpsCatalogAction(catalogClient, auth)
        const logger = { info: jest.fn() }

        auth.getPluginRequestToken.mockResolvedValue({ token: 'auth-token' })

        await action.handler({
            input: {
                catalogInfoUrl: 'https://example.com/catalog-info.yaml'
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
            async getInitiatorCredentials() {
                return {
                    token: 'auth-token',
                    $$type: '@backstage/BackstageCredentials',
                    principal: 'user'
                }
            }
        })

        expect(auth.getPluginRequestToken).toHaveBeenCalledWith({
            onBehalfOf: {
                token: 'auth-token',
                $$type: '@backstage/BackstageCredentials',
                principal: 'user'
            },
            targetPluginId: 'catalog'
        })

        expect(catalogClient.addLocation).toHaveBeenCalledWith(
            {
                type: 'url',
                target: 'https://example.com/catalog-info.yaml'
            },
            {
                token: 'auth-token',
            }
        )
    })
})

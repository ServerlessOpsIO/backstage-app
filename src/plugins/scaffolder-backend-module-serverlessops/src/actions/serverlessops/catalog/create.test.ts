import { createMockDirectory } from '@backstage/backend-test-utils'
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'
import {
    getJwt,
    ProviderConfig
} from '@internal/backstage-plugin-catalog-backend-module-serverlessops-catalog'
import mockFetch from "jest-fetch-mock"

// Add mock before other imports
jest.mock('@internal/backstage-plugin-catalog-backend-module-serverlessops-catalog', () => ({
    ...jest.requireActual('@internal/backstage-plugin-catalog-backend-module-serverlessops-catalog'),
    getJwt: jest.fn()
}))

import { createServerlessOpsCatalogAction } from './create';

describe('serverlessops:catalog:create', () => {
    let config: ProviderConfig;
    beforeEach(() => {
        config = {
            baseUrl: 'https://example.com',
            auth: {
                endpoint: 'https://example.com/auth',
                clientId: 'test',
                clientSecret: 'test',
            }
        } as ProviderConfig

        (getJwt as jest.Mock).mockResolvedValue('mock-jwt-token')

        mockFetch.enableMocks()
    })
    afterEach(() => {
        mockFetch.resetMocks()
        jest.resetAllMocks();
    });

    it('should call action', async () => {
        const action = createServerlessOpsCatalogAction( config );

        const logger = { info: jest.fn() };

        mockFetch.mockResponse(JSON.stringify({}), {status: 201})
        const workspacePath = createMockDirectory().resolve('workspace');

        await action.handler(
            createMockActionContext({
                input: {
                    kind: 'Domain',
                    namespace: 'default',
                    name: 'Test',
                    description: 'Test thing',
                    owner: 'test',
                },
                workspacePath,
                logger: logger as any,
                output: jest.fn(),
                createTemporaryDirectory() {
                    // Usage of createMockDirectory is recommended for testing of filesystem operations
                    throw new Error('Not implemented');
                },
                checkpoint() {
                    throw new Error('Not implemented');
                },
                getInitiatorCredentials() {
                    throw new Error('Not implemented');
                }
            })
        )
        expect(getJwt).toHaveBeenCalled();
        const entity = JSON.parse(mockFetch.mock.calls[0][1]!.body as string);
        expect(entity.metadata).not.toHaveProperty('annotations');
    });

    it.each(['prod', 'dev', 'poc'])('should preserve annotations for the %s environment', async environment => {
        const action = createServerlessOpsCatalogAction(config);
        const annotations = {
            'serverlessops.io/giuthub-environment': environment,
        };
        mockFetch.mockResponse(JSON.stringify({}), {status: 201});

        await action.handler(
            createMockActionContext({
                input: {
                    kind: 'Resource',
                    namespace: 'default',
                    name: `env-test-${environment}`,
                    description: 'Test environment',
                    owner: 'test',
                    type: 'environment',
                    annotations,
                },
            }),
        );

        const entity = JSON.parse(mockFetch.mock.calls[0][1]!.body as string);
        expect(entity.metadata.annotations).toEqual(annotations);
    });
});

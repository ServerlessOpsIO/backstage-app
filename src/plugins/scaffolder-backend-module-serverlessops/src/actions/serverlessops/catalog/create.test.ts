import { PassThrough } from 'stream';
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

        await action.handler({
            input: {
                kind: 'Domain',
                namespace: 'default',
                name: 'Test',
                description: 'Test thing',
                owner: 'test',
            },
            workspacePath: '/tmp',
            logger: logger as any,
            logStream: new PassThrough(),
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
        });

        expect(getJwt).toHaveBeenCalled();
    });
});

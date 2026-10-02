import { createMockDirectory } from '@backstage/backend-test-utils'
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'
import mockFetch from 'jest-fetch-mock'

import { launchGithubCopilotAgentAction } from './launch'

describe('github:copilot:agent:launch', () => {
    beforeEach(() => {
        mockFetch.enableMocks()
    })

    afterEach(() => {
        mockFetch.resetMocks()
        jest.resetAllMocks()
    })

    test('launches a Copilot agent task', async () => {
        const action = launchGithubCopilotAgentAction()
        const logger = { info: jest.fn() }
        const output = jest.fn()
        const workspacePath = createMockDirectory().resolve('workspace')

        mockFetch.mockResponse(
            JSON.stringify({
                id: 12345,
                html_url: 'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/12345',
            }),
            { status: 201, statusText: 'Created' },
        )

        await action.handler(
            createMockActionContext({
                input: {
                    repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
                    prompt: 'Create starter implementation',
                    baseRef: 'main',
                    createPullRequest: true,
                },
                workspacePath,
                logger: logger as any,
                output,
                secrets: {
                    githubToken: 'test-token',
                },
                createTemporaryDirectory() {
                    throw new Error('Not implemented')
                },
                checkpoint() {
                    throw new Error('Not implemented')
                },
                getInitiatorCredentials() {
                    throw new Error('Not implemented')
                },
            }),
        )

        expect(fetch).toHaveBeenCalledWith(
            'https://api.github.com/agents/repos/ServerlessOpsIO/example-repo/tasks',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: '******
                    'X-GitHub-Api-Version': '2026-03-10',
                }),
            }),
        )

        expect(output).toHaveBeenCalledWith('taskId', '12345')
        expect(output).toHaveBeenCalledWith(
            'taskUrl',
            'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/12345',
        )
    })

    test('throws when token is missing', async () => {
        const action = launchGithubCopilotAgentAction()
        const workspacePath = createMockDirectory().resolve('workspace')

        await expect(
            action.handler(
                createMockActionContext({
                    input: {
                        repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
                        prompt: 'Create starter implementation',
                    },
                    workspacePath,
                    logger: { info: jest.fn() } as any,
                    output: jest.fn(),
                    createTemporaryDirectory() {
                        throw new Error('Not implemented')
                    },
                    checkpoint() {
                        throw new Error('Not implemented')
                    },
                    getInitiatorCredentials() {
                        throw new Error('Not implemented')
                    },
                }),
            ),
        ).rejects.toThrow('Missing GitHub token')
    })

    test('throws for invalid repoUrl', async () => {
        const action = launchGithubCopilotAgentAction()
        const workspacePath = createMockDirectory().resolve('workspace')

        await expect(
            action.handler(
                createMockActionContext({
                    input: {
                        repoUrl: 'github.com?owner=ServerlessOpsIO',
                        prompt: 'Create starter implementation',
                    },
                    workspacePath,
                    logger: { info: jest.fn() } as any,
                    output: jest.fn(),
                    secrets: {
                        githubToken: 'test-token',
                    },
                    createTemporaryDirectory() {
                        throw new Error('Not implemented')
                    },
                    checkpoint() {
                        throw new Error('Not implemented')
                    },
                    getInitiatorCredentials() {
                        throw new Error('Not implemented')
                    },
                }),
            ),
        ).rejects.toThrow('Invalid repoUrl')
    })
})

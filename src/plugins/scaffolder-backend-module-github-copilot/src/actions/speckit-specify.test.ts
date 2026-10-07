/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils'

import { createSpecKitSpecifyAction } from './speckit-specify'

const mockRequest = jest.fn()

jest.mock('octokit', () => ({
  Octokit: jest.fn(() => ({ request: mockRequest })),
}))

describe('github:copilot:speckit:specify', () => {
  const action = createSpecKitSpecifyAction()
  const input = {
    repoUrl: 'github.com?owner=ServerlessOpsIO&repo=example-repo',
    prompt: 'Build a photo album app that groups photos by date',
  }
  const taskUrl =
    'https://github.com/ServerlessOpsIO/example-repo/agents/tasks/12345'

  beforeEach(() => {
    mockRequest.mockResolvedValue({
      data: { id: 12345, html_url: taskUrl },
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    mockRequest.mockReset()
  })

  test('launches the specify agent with the user prompt and exposes task outputs', async () => {
    const ctx = createMockActionContext({
      input,
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

    await action.handler(ctx)

    expect(action.id).toBe('github:copilot:speckit:specify')
    expect(action.schema?.input?.properties).not.toHaveProperty('customAgent')
    expect(action.schema?.input?.required).toEqual(['repoUrl', 'prompt'])
    expect(mockRequest).toHaveBeenCalledWith(
      'POST /agents/repos/{owner}/{repo}/tasks',
      {
        owner: 'ServerlessOpsIO',
        repo: 'example-repo',
        prompt: input.prompt,
        model: 'auto',
        create_pull_request: true,
        agent: 'speckit.specify',
      },
    )
    expect(ctx.output).toHaveBeenCalledWith('taskId', '12345')
    expect(ctx.output).toHaveBeenCalledWith('taskUrl', taskUrl)
  })

  test('does not allow the agent to be overridden', async () => {
    const ctx = createMockActionContext({
      input: { ...input, customAgent: 'another-agent' },
      secrets: { USER_GITHUB_TOKEN: 'gh-user-token' },
    })

    await action.handler(ctx)

    expect(mockRequest).toHaveBeenCalledWith(
      'POST /agents/repos/{owner}/{repo}/tasks',
      expect.objectContaining({ agent: 'speckit.specify' }),
    )
  })
})

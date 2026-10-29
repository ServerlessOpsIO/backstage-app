import { OAuthApi } from '@backstage/core-plugin-api';
import {
  GitHubWorkCategory,
  GitHubWorkClient,
  GitHubWorkItem,
} from './github-work-client';

type MockOctokitResponseItem = {
  id: number;
  title: string;
  number: number;
  html_url: string;
  updated_at: string;
  repository_url: string;
  pull_request?: object;
  user?: {
    login?: string;
  };
};

function createAuthApiMock(): OAuthApi {
  return {
    getAccessToken: jest.fn().mockResolvedValue('token-123'),
  };
}

function createClientWithMocks(items: MockOctokitResponseItem[]) {
  const authApi = createAuthApiMock();
  const getAuthenticated = jest.fn().mockResolvedValue({
    data: { login: 'portal-user' },
  });
  const issuesAndPullRequests = jest.fn().mockResolvedValue({
    data: { items, total_count: items.length },
  });

  const client = new GitHubWorkClient(authApi, () => ({
    users: { getAuthenticated },
    search: { issuesAndPullRequests },
  }));

  return { client, issuesAndPullRequests };
}

function expectReadyResult(
  result: unknown,
): asserts result is { status: 'ready'; data: GitHubWorkItem[] } {
  if (
    typeof result !== 'object' ||
    result === null ||
    !('status' in result) ||
    result.status !== 'ready' ||
    !('data' in result) ||
    !Array.isArray(result.data)
  ) {
    throw new Error('Expected a ready result.');
  }
}

describe('GitHubWorkClient', () => {
  test.each<
    [
      GitHubWorkCategory,
      string,
      MockOctokitResponseItem,
      GitHubWorkItem['kind'],
    ]
  >([
    [
      'issues-opened',
      'is:issue is:open author:portal-user',
      {
        id: 1001,
        title: 'Issue opened by me',
        number: 11,
        html_url: 'https://github.com/ServerlessOpsIO/backstage-app/issues/11',
        updated_at: '2026-10-28T10:00:00.000Z',
        repository_url:
          'https://api.github.com/repos/ServerlessOpsIO/backstage-app',
        user: { login: 'portal-user' },
      },
      'issue',
    ],
    [
      'issues-assigned',
      'is:issue is:open assignee:portal-user',
      {
        id: 1002,
        title: 'Issue assigned to me',
        number: 12,
        html_url: 'https://github.com/ServerlessOpsIO/backstage-app/issues/12',
        updated_at: '2026-10-28T10:05:00.000Z',
        repository_url:
          'https://api.github.com/repos/ServerlessOpsIO/backstage-app',
        user: { login: 'teammate' },
      },
      'issue',
    ],
    [
      'prs-opened',
      'is:pr is:open author:portal-user',
      {
        id: 1003,
        title: 'PR opened by me',
        number: 13,
        html_url: 'https://github.com/ServerlessOpsIO/backstage-app/pull/13',
        updated_at: '2026-10-28T10:10:00.000Z',
        repository_url:
          'https://api.github.com/repos/ServerlessOpsIO/backstage-app',
        pull_request: {
          url: 'https://api.github.com/repos/ServerlessOpsIO/backstage-app/pulls/13',
        },
        user: { login: 'portal-user' },
      },
      'pull_request',
    ],
    [
      'prs-review-requested',
      'is:pr is:open review-requested:portal-user',
      {
        id: 1004,
        title: 'PR waiting for review',
        number: 14,
        html_url: 'https://github.com/ServerlessOpsIO/backstage-app/pull/14',
        updated_at: '2026-10-28T10:15:00.000Z',
        repository_url:
          'https://api.github.com/repos/ServerlessOpsIO/backstage-app',
        pull_request: {
          url: 'https://api.github.com/repos/ServerlessOpsIO/backstage-app/pulls/14',
        },
        user: { login: 'teammate' },
      },
      'pull_request',
    ],
  ])(
    'queries and normalizes %s',
    async (category, expectedQuery, item, expectedKind) => {
      const { client, issuesAndPullRequests } = createClientWithMocks([item]);

      const result = await client.getWorkItems({ category, maxItems: 5 });

      expect(issuesAndPullRequests).toHaveBeenCalledWith({
        q: expectedQuery,
        per_page: 5,
        page: 1,
        sort: 'updated',
        order: 'desc',
      });

      expectReadyResult(result);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].kind).toBe(expectedKind);
      expect(result.data[0].repoFullName).toBe('ServerlessOpsIO/backstage-app');
      expect(result.data[0].url.startsWith('https://github.com/')).toBe(true);
    },
  );

  test('returns empty state when no work items are found', async () => {
    const { client } = createClientWithMocks([]);
    const result = await client.getWorkItems({
      category: 'issues-opened',
      maxItems: 5,
    });

    expect(result.status).toBe('empty');
  });

  test('converts zero-based pages to GitHub pages', async () => {
    const { client, issuesAndPullRequests } = createClientWithMocks([]);
    await client.getWorkItems({
      category: 'issues-opened',
      maxItems: 5,
      page: 2,
    });
    expect(issuesAndPullRequests).toHaveBeenCalledWith(
      expect.objectContaining({ per_page: 5, page: 3 }),
    );
  });
});

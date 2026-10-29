import { OAuthApi } from '@backstage/core-plugin-api';
import { Octokit } from '@octokit/rest';
import {
  WidgetDataState,
  createEmptyState,
  createReadyState,
  createUnavailableState,
} from '../models/widget-data-state';

export type GitHubWorkCategory =
  | 'issues-opened'
  | 'issues-assigned'
  | 'prs-opened'
  | 'prs-review-requested';

export interface GitHubWorkRequest {
  category: GitHubWorkCategory;
  maxItems: number;
}

export interface GitHubWorkItem {
  id: number;
  kind: 'issue' | 'pull_request';
  title: string;
  repoFullName: string;
  url: string;
  number: number;
  updatedAt: string;
  authorLogin: string;
}

export type GitHubWorkResult = Extract<
  WidgetDataState<GitHubWorkItem[]>,
  { status: 'ready' | 'empty' | 'unavailable' }
>;

interface OctokitSearchItem {
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
}

interface OctokitLike {
  users: {
    getAuthenticated: () => Promise<{
      data: {
        login: string;
      };
    }>;
  };
  search: {
    issuesAndPullRequests: (params: {
      q: string;
      per_page: number;
      sort: 'updated';
      order: 'desc';
    }) => Promise<{
      data: {
        items: OctokitSearchItem[];
      };
    }>;
  };
}

const MAX_ITEMS_LIMIT = 25;

const CATEGORY_QUERY_PREFIX: Record<GitHubWorkCategory, string> = {
  'issues-opened': 'is:issue is:open author:',
  'issues-assigned': 'is:issue is:open assignee:',
  'prs-opened': 'is:pr is:open author:',
  'prs-review-requested': 'is:pr is:open review-requested:',
};

function assertGitHubRequest(request: GitHubWorkRequest): void {
  if (!Object.prototype.hasOwnProperty.call(CATEGORY_QUERY_PREFIX, request.category)) {
    throw new Error('Exactly one category per widget.');
  }

  if (request.maxItems <= 0 || request.maxItems > MAX_ITEMS_LIMIT) {
    throw new Error('`maxItems` must be positive and bounded for rendering consistency.');
  }
}

function extractRepoFullName(repositoryUrl: string): string {
  const url = new URL(repositoryUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

function assertGitHubHttpsUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') {
    throw new Error('`url` must be valid HTTPS GitHub URL.');
  }
}

function isExpectedKind(item: OctokitSearchItem, category: GitHubWorkCategory): boolean {
  if (category === 'issues-opened' || category === 'issues-assigned') {
    return !item.pull_request;
  }
  return Boolean(item.pull_request);
}

function normalizeItem(item: OctokitSearchItem): GitHubWorkItem {
  assertGitHubHttpsUrl(item.html_url);

  return {
    id: item.id,
    kind: item.pull_request ? 'pull_request' : 'issue',
    title: item.title,
    repoFullName: extractRepoFullName(item.repository_url),
    url: item.html_url,
    number: item.number,
    updatedAt: item.updated_at,
    authorLogin: item.user?.login ?? 'unknown',
  };
}

function getEmptyMessage(category: GitHubWorkCategory): string {
  const messages: Record<GitHubWorkCategory, string> = {
    'issues-opened': 'No open issues created by you were found.',
    'issues-assigned': 'No open issues assigned to you were found.',
    'prs-opened': 'No open pull requests created by you were found.',
    'prs-review-requested': 'No open pull requests requesting your review were found.',
  };
  return messages[category];
}

export class GitHubWorkClient {
  constructor(
    private readonly authApi: OAuthApi,
    private readonly createOctokit: (token: string) => OctokitLike = token =>
      new Octokit({ auth: token }),
  ) {}

  async getWorkItems(request: GitHubWorkRequest): Promise<GitHubWorkResult> {
    try {
      assertGitHubRequest(request);

      const token = await this.authApi.getAccessToken(['read:user']);
      if (!token) {
        return createUnavailableState('GitHub account is not linked for the current user.');
      }

      const octokit = this.createOctokit(token);
      const { data: profile } = await octokit.users.getAuthenticated();
      const query = `${CATEGORY_QUERY_PREFIX[request.category]}${profile.login}`;
      const { data } = await octokit.search.issuesAndPullRequests({
        q: query,
        per_page: request.maxItems,
        sort: 'updated',
        order: 'desc',
      });

      const normalizedItems = data.items
        .filter(item => isExpectedKind(item, request.category))
        .map(normalizeItem);

      if (normalizedItems.length === 0) {
        return createEmptyState(getEmptyMessage(request.category));
      }

      return createReadyState(normalizedItems);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown GitHub API error.';
      return createUnavailableState(`GitHub data is currently unavailable: ${errorMessage}`);
    }
  }
}

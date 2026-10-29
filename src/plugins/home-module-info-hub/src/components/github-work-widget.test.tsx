import { fireEvent, screen, within } from '@testing-library/react';
import { githubAuthApiRef } from '@backstage/core-plugin-api';
import { renderInTestApp } from '@backstage/frontend-test-utils';
import {
  GitHubWorkCategory,
  GitHubWorkResult,
} from '../api/github-work-client';
import {
  GitHubWorkWidget,
  GitHubWorkWidgetRenderer,
} from './github-work-widget';

const mockGitHubAuthApi = {
  getAccessToken: jest.fn(),
};

function render(element: JSX.Element) {
  return renderInTestApp(
    <GitHubWorkWidgetRenderer title="GitHub work" Content={() => element} />,
    {
      apis: [[githubAuthApiRef, mockGitHubAuthApi]],
    },
  );
}

jest.mock('./widget-state-panel', () => ({
  WidgetStatePanel: ({
    state,
    loadingMessage,
  }: {
    state: { status: string; message?: string };
    loadingMessage?: string;
  }) => (
    <div>{state.status === 'loading' ? loadingMessage : state.message}</div>
  ),
}));

describe('GitHubWorkWidget', () => {
  test('shows loading state while data is being fetched', () => {
    const unresolved = new Promise<GitHubWorkResult>(() => {});

    render(
      <GitHubWorkWidget
        category="issues-opened"
        title="Opened Issues"
        loadWorkItems={() => unresolved}
      />,
    );

    expect(screen.getByText('Opened Issues is loading…')).toBeInTheDocument();
  });

  test.each<GitHubWorkCategory>([
    'issues-opened',
    'issues-assigned',
    'prs-opened',
    'prs-review-requested',
  ])('renders %s items in separate table columns', async category => {
    render(
      <GitHubWorkWidget
        category={category}
        title="Opened Issues"
        loadWorkItems={async () => ({
          status: 'ready',
          totalCount: 1,
          data: [
            {
              id: 1,
              kind: 'issue',
              title: 'Fix homepage layout',
              repoFullName: 'ServerlessOpsIO/backstage-app',
              url: 'https://github.com/ServerlessOpsIO/backstage-app/issues/12345',
              number: 12345,
              updatedAt: '2026-10-28T12:00:00.000Z',
              authorLogin: 'portal-user',
            },
          ],
        })}
      />,
    );

    const [table] = await screen.findAllByRole('table');
    expect(screen.getByText('GitHub work')).toBeVisible();
    expect(table.closest('.MuiPaper-root')).toHaveClass('MuiCard-root');
    expect(table.closest('.MuiCardContent-root')?.className).toMatch(
      /BackstageInfoCard-noPadding/,
    );
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map(header => header.textContent),
    ).toEqual(['Repository', '#', 'Description']);

    const row = within(table).getByRole('row', {
      name: /ServerlessOpsIO\/backstage-app.*#12345.*Fix homepage layout/,
    });
    expect(
      within(row)
        .getAllByRole('cell')
        .map(cell => cell.textContent),
    ).toEqual([
      'ServerlessOpsIO/backstage-app, Opens in a new window',
      '#12345, Opens in a new window',
      'Fix homepage layout',
    ]);
    expect(within(row).getByRole('cell', { name: /^#12345/ })).toHaveStyle({
      whiteSpace: 'nowrap',
    });
    expect(
      within(row).getByRole('link', {
        name: /^ServerlessOpsIO\/backstage-app/,
      }),
    ).toHaveAttribute(
      'href',
      'https://github.com/ServerlessOpsIO/backstage-app',
    );
    expect(within(row).getByRole('link', { name: /^#12345/ })).toHaveAttribute(
      'href',
      'https://github.com/ServerlessOpsIO/backstage-app/issues/12345',
    );
    for (const link of within(row).getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer');
    }
  });

  test('loads five items per page and supports next and previous pages', async () => {
    const loadWorkItems = jest.fn(
      async ({ page = 0 }): Promise<GitHubWorkResult> => ({
        status: 'ready',
        totalCount: 12,
        data: Array.from({ length: page === 2 ? 2 : 5 }, (_, index) => {
          const number = page * 5 + index + 1;
          return {
            id: number,
            kind: 'issue',
            title: `Issue ${number}`,
            repoFullName: 'ServerlessOpsIO/backstage-app',
            url: `https://github.com/ServerlessOpsIO/backstage-app/issues/${number}`,
            number,
            updatedAt: '2026-10-28T12:00:00.000Z',
            authorLogin: 'portal-user',
          };
        }),
      }),
    );

    render(
      <GitHubWorkWidget
        category="issues-opened"
        title="Opened Issues"
        loadWorkItems={loadWorkItems}
      />,
    );

    expect(await screen.findByText('Issue 1')).toBeVisible();
    expect(screen.getByText('Issue 5')).toBeVisible();
    expect(screen.queryByText('Issue 6')).not.toBeInTheDocument();
    expect(loadWorkItems).toHaveBeenLastCalledWith({
      category: 'issues-opened',
      maxItems: 5,
      page: 0,
    });

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(await screen.findByText('Issue 6')).toBeVisible();
    expect(screen.getByText('Issue 10')).toBeVisible();
    expect(screen.queryByText('Issue 1')).not.toBeInTheDocument();
    expect(loadWorkItems).toHaveBeenLastCalledWith({
      category: 'issues-opened',
      maxItems: 5,
      page: 1,
    });

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(await screen.findByText('Issue 12')).toBeVisible();
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
    expect(await screen.findByText('Issue 6')).toBeVisible();
  });

  test('renders empty state message', async () => {
    render(
      <GitHubWorkWidget
        category="issues-opened"
        title="Opened Issues"
        loadWorkItems={async () => ({
          status: 'empty',
          message: 'No open issues created by you were found.',
        })}
      />,
    );

    expect(
      await screen.findByText('No open issues created by you were found.'),
    ).toBeInTheDocument();
  });

  test('renders unavailable state message', async () => {
    render(
      <GitHubWorkWidget
        category="issues-opened"
        title="Opened Issues"
        loadWorkItems={async () => ({
          status: 'unavailable',
          message: 'GitHub account is not linked for the current user.',
        })}
      />,
    );

    expect(
      await screen.findByText(
        'GitHub account is not linked for the current user.',
      ),
    ).toBeInTheDocument();
  });
});

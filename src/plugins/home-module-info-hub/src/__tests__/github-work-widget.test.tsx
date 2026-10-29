import { render, screen, waitFor } from '@testing-library/react';
import { GitHubWorkWidget } from '../components/github-work-widget';

jest.mock('@backstage/core-plugin-api', () => ({
  githubAuthApiRef: {},
  useApi: () => ({
    getAccessToken: jest.fn(),
  }),
}));

describe('GitHubWorkWidget', () => {
  test('shows loading state while data is being fetched', () => {
    const unresolved = new Promise(() => {});

    render(
      <GitHubWorkWidget
        category="issues-opened"
        title="Opened Issues"
        loadWorkItems={() => unresolved}
      />,
    );

    expect(screen.getByText('Opened Issues is loading…')).toBeInTheDocument();
  });

  test('renders ready state items', async () => {
    render(
      <GitHubWorkWidget
        category="issues-opened"
        title="Opened Issues"
        loadWorkItems={async () => ({
          status: 'ready',
          data: [
            {
              id: 1,
              kind: 'issue',
              title: 'Fix homepage layout',
              repoFullName: 'ServerlessOpsIO/backstage-app',
              url: 'https://github.com/ServerlessOpsIO/backstage-app/issues/1',
              number: 1,
              updatedAt: '2026-10-28T12:00:00.000Z',
              authorLogin: 'portal-user',
            },
          ],
        })}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          'ServerlessOpsIO/backstage-app #1: Fix homepage layout',
        ),
      ).toBeInTheDocument();
    });
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

    await waitFor(() => {
      expect(
        screen.getByText('No open issues created by you were found.'),
      ).toBeInTheDocument();
    });
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

    await waitFor(() => {
      expect(
        screen.getByText('GitHub account is not linked for the current user.'),
      ).toBeInTheDocument();
    });
  });
});

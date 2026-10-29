import { render, screen, waitFor } from '@testing-library/react';
import { GoogleCalendarWidget } from '../components/google-calendar-widget';

const mockGoogleAuthApi = {
  getAccessToken: jest.fn(),
};

jest.mock('@backstage/core-plugin-api', () => ({
  googleAuthApiRef: {},
  useApi: () => mockGoogleAuthApi,
}));

jest.mock('../components/widget-state-panel', () => ({
  WidgetStatePanel: ({
    state,
    loadingMessage,
  }: {
    state: { status: string; message?: string };
    loadingMessage?: string;
  }) => (
    <div>
      {state.status === 'loading' ? loadingMessage : state.message}
    </div>
  ),
}));

describe('GoogleCalendarWidget', () => {
  test('renders ready events', async () => {
    render(
      <GoogleCalendarWidget
        title="Today's Calendar"
        loadTodayEvents={async () => ({
          status: 'ready',
          data: [
            {
              id: 'event-1',
              summary: 'Daily standup',
              start: '2026-10-28T14:00:00.000Z',
              end: '2026-10-28T14:30:00.000Z',
              isAllDay: false,
            },
          ],
        })}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          'Daily standup — 2026-10-28T14:00:00.000Z to 2026-10-28T14:30:00.000Z',
        ),
      ).toBeInTheDocument();
    });
  });

  test('renders empty state message', async () => {
    render(
      <GoogleCalendarWidget
        title="Today's Calendar"
        loadTodayEvents={async () => ({
          status: 'empty',
          message: 'No events are scheduled for today.',
        })}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText('No events are scheduled for today.'),
      ).toBeInTheDocument();
    });
  });

  test('renders unavailable state message', async () => {
    render(
      <GoogleCalendarWidget
        title="Today's Calendar"
        loadTodayEvents={async () => ({
          status: 'unavailable',
          message: 'Google Calendar account is not linked for the current user.',
        })}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          'Google Calendar account is not linked for the current user.',
        ),
      ).toBeInTheDocument();
    });
  });
});

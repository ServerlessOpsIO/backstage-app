import { fireEvent, screen, within } from '@testing-library/react';
import {
  CalendarTodayRequest,
  CalendarTodayResult,
} from '../api/google-calendar-client';
import { googleAuthApiRef } from '@backstage/core-plugin-api';
import { renderInTestApp } from '@backstage/frontend-test-utils';
import {
  GoogleCalendarWidget,
  GoogleCalendarWidgetRenderer,
} from './google-calendar-widget';

const mockGoogleAuthApi = {
  getAccessToken: jest.fn(),
};

function render(element: JSX.Element) {
  return renderInTestApp(
    <GoogleCalendarWidgetRenderer
      title="Today's Calendar"
      Content={() => element}
    />,
    { apis: [[googleAuthApiRef, mockGoogleAuthApi]] },
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

describe('GoogleCalendarWidget', () => {
  test('navigates days, updates the heading and returns to today even from empty days', async () => {
    const today = new Date();
    const formatDay = (date: Date) =>
      date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    const loadTodayEvents = jest.fn(
      async ({ now }: CalendarTodayRequest): Promise<CalendarTodayResult> => ({
        status: 'empty',
        message: `No events: ${formatDay(now)}`,
      }),
    );
    render(
      <GoogleCalendarWidget
        title="Calendar"
        loadTodayEvents={loadTodayEvents}
      />,
    );
    expect(
      await screen.findByText(`No events: ${formatDay(today)}`),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Next day' }));
    const tomorrow = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );
    expect(
      await screen.findByText(`No events: ${formatDay(tomorrow)}`),
    ).toBeVisible();
    expect(screen.getByText(formatDay(tomorrow))).toBeVisible();
    expect(loadTodayEvents.mock.calls.at(-1)?.[0].now.getDate()).toBe(
      tomorrow.getDate(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(
      await screen.findByText(`No events: ${formatDay(today)}`),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }));
    const yesterday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 1,
    );
    expect(
      await screen.findByText(`No events: ${formatDay(yesterday)}`),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(
      await screen.findByText(`No events: ${formatDay(today)}`),
    ).toBeVisible();
    expect(screen.getByText(formatDay(today))).toBeVisible();
  });

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
            {
              id: 'event-2',
              start: '2026-10-28',
              end: '2026-10-29',
              isAllDay: true,
            },
          ],
        })}
      />,
    );

    const table = await screen.findByRole('table');
    expect(
      screen.getByText(
        new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }),
      ),
    ).toBeVisible();
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map(header => header.textContent),
    ).toEqual(['Event', 'Time']);
    const format = (value: string) =>
      new Date(value).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
    const row = within(table).getByRole('row', { name: /Daily standup/ });
    expect(
      within(row)
        .getAllByRole('cell')
        .map(cell => cell.textContent),
    ).toEqual([
      'Daily standup',
      `${format('2026-10-28T14:00:00.000Z')} to ${format(
        '2026-10-28T14:30:00.000Z',
      )}`,
    ]);
    expect(
      within(table).getByRole('row', { name: 'Untitled event All day' }),
    ).toBeVisible();
    expect(table.closest('.MuiPaper-root')).toHaveClass('MuiCard-root');
    expect(table.closest('.MuiCardContent-root')?.className).toMatch(
      /BackstageInfoCard-noPadding/,
    );
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

    expect(
      await screen.findByText('No events are scheduled for today.'),
    ).toBeInTheDocument();
  });

  test('renders unavailable state message', async () => {
    render(
      <GoogleCalendarWidget
        title="Today's Calendar"
        loadTodayEvents={async () => ({
          status: 'unavailable',
          message:
            'Google Calendar account is not linked for the current user.',
        })}
      />,
    );

    expect(
      await screen.findByText(
        'Google Calendar account is not linked for the current user.',
      ),
    ).toBeInTheDocument();
  });
});

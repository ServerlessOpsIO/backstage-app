import { OAuthApi } from '@backstage/core-plugin-api';
import {
  WidgetDataState,
  createEmptyState,
  createReadyState,
  createUnavailableState,
} from '../models/widget-data-state';

interface CalendarEventDateTime {
  date?: string;
  dateTime?: string;
}

interface CalendarApiEvent {
  id?: string;
  summary?: string;
  htmlLink?: string;
  start?: CalendarEventDateTime;
  end?: CalendarEventDateTime;
}

interface CalendarApiResponse {
  items?: CalendarApiEvent[];
}

export interface CalendarTodayRequest {
  calendarId: 'primary';
  now: Date;
}

export interface CalendarEventSummary {
  id: string;
  summary?: string;
  start: string;
  end: string;
  htmlLink?: string;
  isAllDay: boolean;
}

export type CalendarTodayResult = Extract<
  WidgetDataState<CalendarEventSummary[]>,
  { status: 'ready' | 'empty' | 'unavailable' }
>;

export interface CalendarQueryWindow {
  timeMin: Date;
  timeMax: Date;
}

function toStartOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function toStartOfNextLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
}

function assertCalendarQueryWindow(now: Date, queryWindow: CalendarQueryWindow): void {
  if (queryWindow.timeMin.getTime() >= queryWindow.timeMax.getTime()) {
    throw new Error('`timeMin < timeMax`.');
  }

  const expectedStart = toStartOfLocalDay(now).getTime();
  const expectedEnd = toStartOfNextLocalDay(now).getTime();
  if (
    queryWindow.timeMin.getTime() !== expectedStart ||
    queryWindow.timeMax.getTime() !== expectedEnd
  ) {
    throw new Error(
      "Query window must represent the selected day in the browser's local timezone.",
    );
  }
}

function normalizeEvent(event: CalendarApiEvent): CalendarEventSummary | undefined {
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date;
  const id = event.id;

  if (!start || !end || !id) {
    return undefined;
  }

  return {
    id,
    summary: event.summary,
    start,
    end,
    htmlLink: event.htmlLink,
    isAllDay: Boolean(event.start?.date && !event.start?.dateTime),
  };
}

export function buildLocalDayWindow(now: Date): CalendarQueryWindow {
  return {
    timeMin: toStartOfLocalDay(now),
    timeMax: toStartOfNextLocalDay(now),
  };
}

export class GoogleCalendarClient {
  constructor(
    private readonly authApi: OAuthApi,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async getTodayEvents(request: CalendarTodayRequest): Promise<CalendarTodayResult> {
    try {
      const queryWindow = buildLocalDayWindow(request.now);
      assertCalendarQueryWindow(request.now, queryWindow);

      const token = await this.authApi.getAccessToken([
        'https://www.googleapis.com/auth/calendar.readonly',
      ]);
      if (!token) {
        return createUnavailableState('Google Calendar account is not linked for the current user.');
      }

      const searchParams = new URLSearchParams({
        timeMin: queryWindow.timeMin.toISOString(),
        timeMax: queryWindow.timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
      });

      const response = await this.fetchFn(
        `https://www.googleapis.com/calendar/v3/calendars/${request.calendarId}/events?${searchParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        return createUnavailableState(
          `Google Calendar data is currently unavailable: HTTP ${response.status}`,
        );
      }

      const payload = (await response.json()) as CalendarApiResponse;
      const events = (payload.items ?? [])
        .map(normalizeEvent)
        .filter((event): event is CalendarEventSummary => Boolean(event));

      if (events.length === 0) {
        return createEmptyState('No events are scheduled for this day.');
      }

      return createReadyState(events);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown Google Calendar API error.';
      return createUnavailableState(
        `Google Calendar data is currently unavailable: ${errorMessage}`,
      );
    }
  }
}

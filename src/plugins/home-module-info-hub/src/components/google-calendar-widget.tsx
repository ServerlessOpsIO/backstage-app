import { googleAuthApiRef, useApi } from '@backstage/core-plugin-api';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarEventSummary,
  CalendarTodayRequest,
  CalendarTodayResult,
  GoogleCalendarClient,
} from '../api/google-calendar-client';
import {
  WidgetDataState,
  assertWidgetDataState,
  createLoadingState,
  createUnavailableState,
} from '../models/widget-data-state';
import { WidgetStatePanel } from './widget-state-panel';

export interface GoogleCalendarWidgetProps {
  title: string;
  loadTodayEvents?: (request: CalendarTodayRequest) => Promise<CalendarTodayResult>;
  now?: Date;
}

export function GoogleCalendarWidget(props: GoogleCalendarWidgetProps): JSX.Element {
  const { title, loadTodayEvents, now } = props;
  const authApi = useApi(googleAuthApiRef);
  const client = useMemo(() => new GoogleCalendarClient(authApi), [authApi]);
  const requestNow = useMemo(() => now ?? new Date(), [now]);
  const [state, setState] = useState<WidgetDataState<CalendarEventSummary[]>>(
    createLoadingState(),
  );

  useEffect(() => {
    let cancelled = false;
    const loader =
      loadTodayEvents ??
      (async (request: CalendarTodayRequest) => {
        return client.getTodayEvents(request);
      });

    setState(createLoadingState());

    loader({ calendarId: 'primary', now: requestNow })
      .then(result => {
        if (cancelled) {
          return;
        }

        assertWidgetDataState(result);
        setState(result);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setState(
          createUnavailableState('Google Calendar data is currently unavailable.'),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [client, loadTodayEvents, requestNow]);

  if (state.status === 'ready') {
    return (
      <ul>
        {state.data.map(event => (
          <li key={event.id}>
            {event.summary ?? 'Untitled event'} —{' '}
            {event.isAllDay ? 'All day' : `${event.start} to ${event.end}`}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <WidgetStatePanel
      state={state}
      loadingMessage={`${title} is loading…`}
    />
  );
}

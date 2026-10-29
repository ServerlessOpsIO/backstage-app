import { InfoCard, Table, TableColumn } from '@backstage/core-components';
import { RendererProps } from '@backstage/plugin-home-react';
import { googleAuthApiRef, useApi } from '@backstage/core-plugin-api';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Button from '@material-ui/core/Button';
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

const selectedDayContext = createContext<Date | undefined>(undefined);

export function GoogleCalendarWidgetRenderer({ Content }: RendererProps) {
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const changeDay = (offset: number) => {
    setSelectedDay(
      current =>
        new Date(
          current.getFullYear(),
          current.getMonth(),
          current.getDate() + offset,
        ),
    );
  };
  const day = selectedDay.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return (
    <InfoCard
      title={day}
      divider
      noPadding
      variant="fullHeight"
      actions={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <Button aria-label="Previous day" onClick={() => changeDay(-1)}>
            Previous
          </Button>
          <Button onClick={() => setSelectedDay(new Date())}>Today</Button>
          <Button aria-label="Next day" onClick={() => changeDay(1)}>
            Next
          </Button>
        </div>
      }
    >
      <selectedDayContext.Provider value={selectedDay}>
        <Content />
      </selectedDayContext.Provider>
    </InfoCard>
  );
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

const columns: TableColumn<CalendarEventSummary>[] = [
  {
    title: 'Event',
    field: 'summary',
    highlight: true,
    render: event => event.summary ?? 'Untitled event',
  },
  {
    title: 'Time',
    field: 'start',
    render: event =>
      event.isAllDay
        ? 'All day'
        : `${formatTime(event.start)} to ${formatTime(event.end)}`,
  },
];

export interface GoogleCalendarWidgetProps {
  title: string;
  loadTodayEvents?: (
    request: CalendarTodayRequest,
  ) => Promise<CalendarTodayResult>;
  now?: Date;
}

export function GoogleCalendarWidget(
  props: GoogleCalendarWidgetProps,
): JSX.Element {
  const { title, loadTodayEvents, now } = props;
  const selectedDay = useContext(selectedDayContext);
  const authApi = useApi(googleAuthApiRef);
  const client = useMemo(() => new GoogleCalendarClient(authApi), [authApi]);
  const requestNow = useMemo(
    () => now ?? selectedDay ?? new Date(),
    [now, selectedDay],
  );
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
          createUnavailableState(
            'Google Calendar data is currently unavailable.',
          ),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [client, loadTodayEvents, requestNow]);

  if (state.status === 'ready') {
    return (
      <Table
        components={{ Container: props => <div {...props} /> }}
        columns={columns}
        data={state.data}
        options={{
          tableLayout: 'fixed',
          paging: false,
          search: false,
          toolbar: false,
          padding: 'dense',
          sorting: false,
        }}
      />
    );
  }

  return (
    <WidgetStatePanel state={state} loadingMessage={`${title} is loading…`} />
  );
}

import { createUnavailableState } from '../models/widget-data-state';
import { WidgetStatePanel } from './widget-state-panel';

export interface GoogleCalendarWidgetProps {
  title: string;
}

export function GoogleCalendarWidget(props: GoogleCalendarWidgetProps): JSX.Element {
  const { title } = props;

  return (
    <WidgetStatePanel
      state={createUnavailableState('Google Calendar data is not available yet for this environment.')}
      loadingMessage={`${title} is loading…`}
    />
  );
}

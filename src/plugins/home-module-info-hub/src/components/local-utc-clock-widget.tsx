import { useEffect, useMemo, useState } from 'react';
import { createUnavailableState } from '../models/widget-data-state';
import { WidgetStatePanel } from './widget-state-panel';

function formatClockTime(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone,
    timeZoneName: 'short',
  }).format(date);
}

function resolveLocalTimeZone(): string | undefined {
  const resolved = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!resolved || resolved.trim().length === 0) {
    return undefined;
  }
  return resolved;
}

export function LocalUtcClockWidget(): JSX.Element {
  const localTimeZone = useMemo(() => resolveLocalTimeZone(), []);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  if (!localTimeZone) {
    return (
      <WidgetStatePanel
        state={createUnavailableState(
          'Local timezone could not be detected in this browser session.',
        )}
      />
    );
  }

  return (
    <div>
      <div>
        <strong>Local ({localTimeZone})</strong>
      </div>
      <div>{formatClockTime(now, localTimeZone)}</div>
      <div style={{ marginTop: '0.5rem' }}>
        <strong>UTC</strong>
      </div>
      <div>{formatClockTime(now, 'UTC')}</div>
    </div>
  );
}

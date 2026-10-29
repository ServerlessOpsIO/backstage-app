import { Progress } from '@backstage/core-components';
import { CSSProperties } from 'react';
import { WidgetDataState } from '../models/widget-data-state';

export type WidgetStatePanelProps = {
  state: WidgetDataState<unknown>;
  loadingMessage?: string;
};

const panelStyle: CSSProperties = {
  padding: '0.75rem 0.25rem',
};

export function WidgetStatePanel(props: WidgetStatePanelProps): JSX.Element | null {
  const { state, loadingMessage = 'Loading…' } = props;

  if (state.status === 'loading') {
    return (
      <div style={panelStyle} aria-busy="true">
        <Progress />
        <span>{loadingMessage}</span>
      </div>
    );
  }

  if (state.status === 'empty' || state.status === 'unavailable') {
    return (
      <div style={panelStyle} role="status">
        {state.message}
      </div>
    );
  }

  return null;
}

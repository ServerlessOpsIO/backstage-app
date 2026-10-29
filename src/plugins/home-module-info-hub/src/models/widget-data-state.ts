export type WidgetDataState<TData> =
  | {
      status: 'idle';
      lastUpdatedAt?: string;
    }
  | {
      status: 'loading';
      lastUpdatedAt?: string;
    }
  | {
      status: 'ready';
      data: TData;
      lastUpdatedAt?: string;
    }
  | {
      status: 'empty';
      message: string;
      lastUpdatedAt?: string;
    }
  | {
      status: 'unavailable';
      message: string;
      lastUpdatedAt?: string;
    };

function hasMessage<TData>(state: WidgetDataState<TData>): state is Extract<WidgetDataState<TData>, { message: string }> {
  return state.status === 'empty' || state.status === 'unavailable';
}

export function assertWidgetDataState<TData>(state: WidgetDataState<TData>): void {
  if (state.status === 'ready' && (state.data === undefined || state.data === null)) {
    throw new Error('`ready` requires data payload present.');
  }

  if (hasMessage(state) && state.message.trim().length === 0) {
    throw new Error('`empty` and `unavailable` must provide explicit message text.');
  }
}

export function createIdleState<TData>(): WidgetDataState<TData> {
  return { status: 'idle' };
}

export function createLoadingState<TData>(): WidgetDataState<TData> {
  return { status: 'loading' };
}

export function createReadyState<TData>(data: TData): WidgetDataState<TData> {
  const state: WidgetDataState<TData> = { status: 'ready', data };
  assertWidgetDataState(state);
  return state;
}

export function createEmptyState<TData>(message: string): WidgetDataState<TData> {
  const state: WidgetDataState<TData> = { status: 'empty', message };
  assertWidgetDataState(state);
  return state;
}

export function createUnavailableState<TData>(message: string): WidgetDataState<TData> {
  const state: WidgetDataState<TData> = { status: 'unavailable', message };
  assertWidgetDataState(state);
  return state;
}

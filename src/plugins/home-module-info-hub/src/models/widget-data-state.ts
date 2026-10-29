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

export type WidgetIdleState<TData> = Extract<WidgetDataState<TData>, { status: 'idle' }>;
export type WidgetLoadingState<TData> = Extract<WidgetDataState<TData>, { status: 'loading' }>;
export type WidgetReadyState<TData> = Extract<WidgetDataState<TData>, { status: 'ready' }>;
export type WidgetEmptyState<TData> = Extract<WidgetDataState<TData>, { status: 'empty' }>;
export type WidgetUnavailableState<TData> = Extract<
  WidgetDataState<TData>,
  { status: 'unavailable' }
>;

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

export function createIdleState<TData>(): WidgetIdleState<TData> {
  return { status: 'idle' };
}

export function createLoadingState<TData>(): WidgetLoadingState<TData> {
  return { status: 'loading' };
}

export function createReadyState<TData>(data: TData): WidgetReadyState<TData> {
  const state: WidgetReadyState<TData> = { status: 'ready', data };
  assertWidgetDataState(state);
  return state;
}

export function createEmptyState<TData>(message: string): WidgetEmptyState<TData> {
  const state: WidgetEmptyState<TData> = { status: 'empty', message };
  assertWidgetDataState(state);
  return state;
}

export function createUnavailableState<TData>(
  message: string,
): WidgetUnavailableState<TData> {
  const state: WidgetUnavailableState<TData> = {
    status: 'unavailable',
    message,
  };
  assertWidgetDataState(state);
  return state;
}

/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { InfoCard, Link, Table, TableColumn } from '@backstage/core-components';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { RendererProps } from '@backstage/plugin-home-react';
import { useEffect, useState } from 'react';
import Chip from '@material-ui/core/Chip';
import { amber, green, grey, red } from '@material-ui/core/colors';
import { WidgetStatePanel } from './widget-state-panel';
import { WidgetDataState } from '../models/widget-data-state';

interface DatadogMonitor {
  id: number;
  priority: number | null;
  status: string;
  name: string;
  url: string;
}

function MonitorStatusChip({ status }: { status: string }) {
  let backgroundColor = grey[600];
  if (status === 'Alert') {
    backgroundColor = red[700];
  } else if (status === 'OK') {
    backgroundColor = green[700];
  } else if (status === 'Warn') {
    backgroundColor = amber[500];
  }

  return (
    <Chip
      label={status}
      size="small"
      style={{ backgroundColor, color: status === 'Warn' ? '#000' : '#fff' }}
    />
  );
}

const columns: TableColumn<DatadogMonitor>[] = [
  {
    title: 'Priority',
    field: 'priority',
    width: '100px',
    render: monitor =>
      monitor.priority === null ? 'Not set' : `P${monitor.priority}`,
  },
  {
    title: 'Status',
    field: 'status',
    width: '100px',
    render: monitor => <MonitorStatusChip status={monitor.status} />,
  },
  {
    title: 'Name',
    field: 'name',
    highlight: true,
    render: monitor => (
      <Link to={monitor.url} target="_blank" rel="noreferrer">
        {monitor.name}
      </Link>
    ),
  },
];

export function DatadogMonitorsWidgetRenderer({
  title,
  Content,
}: RendererProps) {
  return (
    <InfoCard title={title} divider noPadding>
      <Content />
    </InfoCard>
  );
}

export function DatadogMonitorsWidget() {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [state, setState] = useState<WidgetDataState<DatadogMonitor[]>>({
    status: 'loading',
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    const load = async () => {
      const baseUrl = await discoveryApi.getBaseUrl('datadog');
      const response = await fetchApi.fetch(
        `${baseUrl}/monitors?page=${page}`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        throw new Error(
          `Datadog monitor data is currently unavailable: HTTP ${response.status}`,
        );
      }
      const payload: { items: DatadogMonitor[]; totalCount: number } =
        await response.json();
      if (
        !Array.isArray(payload.items) ||
        !Number.isSafeInteger(payload.totalCount) ||
        payload.totalCount < 0
      ) {
        throw new Error('Datadog returned an invalid monitor response.');
      }
      if (!controller.signal.aborted) {
        setTotalCount(payload.totalCount);
        setState(
          payload.items.length
            ? { status: 'ready', data: payload.items }
            : {
                status: 'empty',
                message: 'No monitors match the configured Datadog query.',
              },
        );
      }
    };
    load().catch(error => {
      if (!controller.signal.aborted) {
        setState({
          status: 'unavailable',
          message:
            error instanceof Error
              ? error.message
              : 'Datadog monitor data is currently unavailable.',
        });
      }
    });
    return () => controller.abort();
  }, [discoveryApi, fetchApi, page]);

  if (state.status !== 'ready') {
    return (
      <WidgetStatePanel
        state={state}
        loadingMessage="Datadog monitors are loading…"
      />
    );
  }
  return (
    <Table
      columns={columns}
      data={state.data}
      components={{ Container: props => <div {...props} /> }}
      page={page}
      totalCount={totalCount}
      onPageChange={setPage}
      options={{
        pageSize: 5,
        pageSizeOptions: [5],
        emptyRowsWhenPaging: false,
        search: false,
        toolbar: false,
        sorting: false,
        padding: 'dense',
      }}
    />
  );
}

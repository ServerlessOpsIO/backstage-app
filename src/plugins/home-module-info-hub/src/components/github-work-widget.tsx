import {
  InfoCard,
  Link,
  OverflowTooltip,
  Table,
  TableColumn,
} from '@backstage/core-components';
import { RendererProps } from '@backstage/plugin-home-react';
import { githubAuthApiRef, useApi } from '@backstage/core-plugin-api';
import { useEffect, useMemo, useState } from 'react';
import {
  GitHubWorkCategory,
  GitHubWorkClient,
  GitHubWorkItem,
  GitHubWorkRequest,
  GitHubWorkResult,
} from '../api/github-work-client';
import {
  WidgetDataState,
  assertWidgetDataState,
  createLoadingState,
  createUnavailableState,
} from '../models/widget-data-state';
import { WidgetStatePanel } from './widget-state-panel';

export function GitHubWorkWidgetRenderer({ title, Content }: RendererProps) {
  return (
    <InfoCard title={title} divider noPadding>
      <Content />
    </InfoCard>
  );
}

const columns: TableColumn<GitHubWorkItem>[] = [
  {
    title: 'Repository',
    field: 'repoFullName',
    highlight: true,
    width: '25%',
    render: item => (
      <Link
        to={`https://github.com/${item.repoFullName}`}
        target="_blank"
        rel="noreferrer"
      >
        <OverflowTooltip text={item.repoFullName} placement="bottom-start" />
      </Link>
    ),
  },
  {
    title: '#',
    field: 'number',
    width: 'calc(6ch + 32px)',
    cellStyle: { whiteSpace: 'nowrap' },
    headerStyle: { whiteSpace: 'nowrap' },
    render: item => (
      <Link to={item.url} target="_blank" rel="noreferrer">
        #{item.number}
      </Link>
    ),
  },
  {
    title: 'Description',
    field: 'title',
    width: 'auto',
    render: item => (
      <OverflowTooltip text={item.title} placement="bottom-start" />
    ),
  },
];

export interface GitHubWorkWidgetProps {
  category: GitHubWorkCategory;
  title: string;
  maxItems?: number;
  loadWorkItems?: (request: GitHubWorkRequest) => Promise<GitHubWorkResult>;
}

export function GitHubWorkWidget(props: GitHubWorkWidgetProps): JSX.Element {
  const { category, title, maxItems = 5, loadWorkItems } = props;
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const authApi = useApi(githubAuthApiRef);
  const client = useMemo(() => new GitHubWorkClient(authApi), [authApi]);
  const [state, setState] = useState<WidgetDataState<GitHubWorkItem[]>>(
    createLoadingState(),
  );

  useEffect(() => {
    let cancelled = false;
    const loader =
      loadWorkItems ??
      (async (request: GitHubWorkRequest) => {
        return client.getWorkItems(request);
      });

    setState(createLoadingState());

    loader({ category, maxItems, page })
      .then(result => {
        if (cancelled) {
          return;
        }

        assertWidgetDataState(result);
        if (result.status === 'ready') {
          setTotalCount(result.totalCount);
        }
        setState(result);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setState(
          createUnavailableState('GitHub data is currently unavailable.'),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [category, maxItems, page, loadWorkItems, client]);

  if (state.status === 'ready') {
    return (
      <Table
        components={{
          Container: containerProps => <div {...containerProps} />,
        }}
        columns={columns}
        data={state.data}
        page={page}
        totalCount={totalCount}
        onPageChange={setPage}
        options={{
          tableLayout: 'fixed',
          paging: true,
          pageSize: maxItems,
          pageSizeOptions: [maxItems],
          emptyRowsWhenPaging: false,
          sorting: false,
          search: false,
          toolbar: false,
          padding: 'dense',
        }}
      />
    );
  }

  return (
    <WidgetStatePanel state={state} loadingMessage={`${title} is loading…`} />
  );
}

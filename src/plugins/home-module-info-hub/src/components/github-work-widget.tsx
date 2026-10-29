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

export interface GitHubWorkWidgetProps {
  category: GitHubWorkCategory;
  title: string;
  maxItems?: number;
  loadWorkItems?: (request: GitHubWorkRequest) => Promise<GitHubWorkResult>;
}

export function GitHubWorkWidget(props: GitHubWorkWidgetProps): JSX.Element {
  const { category, title, maxItems = 10, loadWorkItems } = props;
  const authApi = useApi(githubAuthApiRef);
  const client = useMemo(() => new GitHubWorkClient(authApi), [authApi]);
  const [state, setState] = useState<WidgetDataState<GitHubWorkItem[]>>(createLoadingState());

  useEffect(() => {
    let cancelled = false;
    const loader =
      loadWorkItems ??
      (async (request: GitHubWorkRequest) => {
        return client.getWorkItems(request);
      });

    setState(createLoadingState());

    loader({ category, maxItems })
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

        setState(createUnavailableState('GitHub data is currently unavailable.'));
      });

    return () => {
      cancelled = true;
    };
  }, [category, maxItems, loadWorkItems, client]);

  if (state.status === 'ready') {
    return (
      <ul>
        {state.data.map(item => (
          <li key={item.id}>
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.repoFullName} #{item.number}: {item.title}
            </a>
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

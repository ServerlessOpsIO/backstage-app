import { createUnavailableState } from '../models/widget-data-state';
import { WidgetStatePanel } from './widget-state-panel';

export type GitHubWorkCategory =
  | 'issues-opened'
  | 'issues-assigned'
  | 'prs-opened'
  | 'prs-review-requested';

export interface GitHubWorkWidgetProps {
  category: GitHubWorkCategory;
  title: string;
}

export function GitHubWorkWidget(props: GitHubWorkWidgetProps): JSX.Element {
  const { title } = props;

  return (
    <WidgetStatePanel
      state={createUnavailableState('GitHub data is not available yet for this environment.')}
      loadingMessage={`${title} is loading…`}
    />
  );
}

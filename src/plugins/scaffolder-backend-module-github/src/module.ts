import { createBackendModule } from "@backstage/backend-plugin-api";
import { scaffolderActionsExtensionPoint  } from '@backstage/plugin-scaffolder-node';
import {
  cloneGithubRepoAction,
  commitFilesToGithubBranchAction,
  commitGitChangesAction,
  createGithubPullRequestAction,
  pushGitBranchAction,
} from './actions';

/**
 * A backend module that registers GitHub actions into the scaffolder
 */
export const scaffolderModule = createBackendModule({
  moduleId: 'x_github',
  pluginId: 'scaffolder',
  register({ registerInit }) {
    registerInit({
      deps: {
        scaffolderActions: scaffolderActionsExtensionPoint
      },
      async init({ scaffolderActions}) {
        scaffolderActions.addActions(
          cloneGithubRepoAction(),
          commitFilesToGithubBranchAction(),
          commitGitChangesAction(),
          createGithubPullRequestAction(),
          pushGitBranchAction(),
        );
      }
    });
  },
})

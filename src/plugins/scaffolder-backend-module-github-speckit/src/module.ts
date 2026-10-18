import { createBackendModule } from "@backstage/backend-plugin-api";
import { scaffolderActionsExtensionPoint  } from '@backstage/plugin-scaffolder-node';
import {
  createSpecKitAnalyzeAction,
  createSpecKitChecklistAction,
  createSpecKitClarifyAction,
  createSpecKitConstitutionAction,
  createSpecKitConvergeAction,
  createSpecKitImplementAction,
  createSpecKitPlanAction,
  createSpecKitSpecifyAction,
  createSpecKitTasksAction,
  createSpecKitTasksToIssuesAction,
  initializeSpecKitAction,
  runSpecKitWorkflowAction,
} from './actions';

/**
 * A backend module that registers the GitHub Spec Kit actions into the scaffolder
 */
export const scaffolderModule = createBackendModule({
  moduleId: 'github-speckit',
  pluginId: 'scaffolder',
  register({ registerInit }) {
    registerInit({
      deps: {
        scaffolderActions: scaffolderActionsExtensionPoint
      },
      async init({ scaffolderActions}) {
        scaffolderActions.addActions(
          initializeSpecKitAction(),
          runSpecKitWorkflowAction(),
          createSpecKitConstitutionAction(),
          createSpecKitPlanAction(),
          createSpecKitSpecifyAction(),
          createSpecKitTasksAction(),
          createSpecKitTasksToIssuesAction(),
          createSpecKitAnalyzeAction(),
          createSpecKitChecklistAction(),
          createSpecKitClarifyAction(),
          createSpecKitConvergeAction(),
          createSpecKitImplementAction(),
        );
      }
    });
  },
})

/**
 * The github-copilot module for @backstage/plugin-scaffolder-backend.
 *
 * @packageDocumentation
 */

export { scaffolderModuleGithubCopilot as default } from './module'
export {
  createGithubCopilotAgentAction,
  launchGithubCopilotAgentAction,
  parseRepoUrl,
} from './actions'
export type { CompletedCopilotAgentTask } from './actions'

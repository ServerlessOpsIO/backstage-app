import { createGithubCopilotAgentAction } from './common'

export function launchGithubCopilotAgentAction() {
  return createGithubCopilotAgentAction({
    id: 'github:copilot:agent:launch',
    description: 'Launches a GitHub Copilot agent task for a repository',
  })
}

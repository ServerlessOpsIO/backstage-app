import { createGithubCopilotAgentAction } from './common'

export function createSpecKitConvergeAction() {
  return createGithubCopilotAgentAction({
    id: 'github:copilot:speckit:converge',
    description:
      'Launches the speckit.converge agent to converge the feature artifacts of a Spec Kit project published to GitHub',
    customAgent: 'speckit.converge',
  })
}

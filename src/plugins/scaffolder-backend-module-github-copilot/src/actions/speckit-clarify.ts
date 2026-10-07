import { createGithubCopilotAgentAction } from './common'

export function createSpecKitClarifyAction() {
  return createGithubCopilotAgentAction({
    id: 'github:copilot:speckit:clarify',
    description:
      'Launches the speckit.clarify agent to clarify underspecified areas of the feature specification for a Spec Kit project published to GitHub',
    customAgent: 'speckit.clarify',
  })
}

import { createGithubCopilotAgentAction } from './common'

export function createSpecKitSpecifyAction() {
  return createGithubCopilotAgentAction({
    id: 'github:copilot:speckit:specify',
    description:
      'Launches the speckit.specify agent to create a feature specification for a Spec Kit project published to GitHub',
    customAgent: 'speckit.specify',
  })
}

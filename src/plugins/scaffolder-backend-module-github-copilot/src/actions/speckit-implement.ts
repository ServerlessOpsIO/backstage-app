import { createGithubCopilotAgentAction } from './common'

export function createSpecKitImplementAction() {
  return createGithubCopilotAgentAction({
    id: 'github:copilot:speckit:implement',
    description:
      'Launches the speckit.implement agent to implement the feature tasks of a Spec Kit project published to GitHub',
    customAgent: 'speckit.implement',
    skillCommand: '/speckit.implement',
  })
}

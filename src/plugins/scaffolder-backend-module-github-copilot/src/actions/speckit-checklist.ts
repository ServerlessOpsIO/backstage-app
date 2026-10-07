import { createGithubCopilotAgentAction } from './common'

export function createSpecKitChecklistAction() {
  return createGithubCopilotAgentAction({
    id: 'github:copilot:speckit:checklist',
    description:
      'Launches the speckit.checklist agent to generate a quality checklist for the feature specification for a Spec Kit project published to GitHub',
    customAgent: 'speckit.checklist',
  })
}

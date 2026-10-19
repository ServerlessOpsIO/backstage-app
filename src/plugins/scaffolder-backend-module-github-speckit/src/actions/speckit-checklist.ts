import { createGithubCopilotAgentAction } from '@internal/backstage-plugin-scaffolder-backend-module-github-copilot'

export function createSpecKitChecklistAction() {
  return createGithubCopilotAgentAction({
    id: 'github:speckit:checklist',
    description:
      'Launches the speckit.checklist agent to generate a quality checklist for the feature specification for a Spec Kit project published to GitHub',
    customAgent: 'speckit.checklist',
    skillCommand: '/speckit-checklist',
  })
}

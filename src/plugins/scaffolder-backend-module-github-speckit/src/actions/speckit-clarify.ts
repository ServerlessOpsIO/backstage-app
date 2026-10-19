import { createGithubCopilotAgentAction } from '@internal/backstage-plugin-scaffolder-backend-module-github-copilot'

export function createSpecKitClarifyAction() {
  return createGithubCopilotAgentAction({
    id: 'github:speckit:clarify',
    description:
      'Launches the speckit.clarify agent to clarify underspecified areas of the feature specification for a Spec Kit project published to GitHub',
    customAgent: 'speckit.clarify',
    skillCommand: '/speckit-clarify',
  })
}

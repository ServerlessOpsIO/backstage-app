import { createGithubCopilotAgentAction } from '@internal/backstage-plugin-scaffolder-backend-module-github-copilot'

export function createSpecKitConvergeAction() {
  return createGithubCopilotAgentAction({
    id: 'github:speckit:converge',
    description:
      'Launches the speckit.converge agent to converge the feature artifacts of a Spec Kit project published to GitHub',
    customAgent: 'speckit.converge',
    skillCommand: '/speckit-converge',
  })
}

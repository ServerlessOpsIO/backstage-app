import { createGithubCopilotAgentAction } from '@internal/backstage-plugin-scaffolder-backend-module-github-copilot'

export function createSpecKitPlanAction() {
  return createGithubCopilotAgentAction({
    id: 'github:speckit:plan',
    description:
      'Launches the speckit.plan agent to create a feature plan for a Spec Kit project published to GitHub',
    customAgent: 'speckit.plan',
    skillCommand: '/speckit-plan',
  })
}
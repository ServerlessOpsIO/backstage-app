import { createGithubCopilotAgentAction } from '@internal/backstage-plugin-scaffolder-backend-module-github-copilot'

export function createSpecKitAnalyzeAction() {
  return createGithubCopilotAgentAction({
    id: 'github:speckit:analyze',
    description:
      'Launches the speckit.analyze agent to check consistency and coverage across the spec, plan, and tasks for a Spec Kit project published to GitHub',
    customAgent: 'speckit.analyze',
    skillCommand: '/speckit-analyze',
  })
}

import { createGithubCopilotAgentAction } from '@internal/backstage-plugin-scaffolder-backend-module-github-copilot'

export function createSpecKitTasksAction() {
  return createGithubCopilotAgentAction({
    id: 'github:speckit:tasks',
    description:
      'Launches the speckit.tasks agent to manage tasks for a Spec Kit project published to GitHub',
    customAgent: 'speckit.tasks',
    skillCommand: '/speckit-tasks',
  })
}
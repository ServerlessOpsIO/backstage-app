import { createGithubCopilotAgentAction } from '@internal/backstage-plugin-scaffolder-backend-module-github-copilot'

export function createSpecKitTasksToIssuesAction() {
  return createGithubCopilotAgentAction({
    id: 'github:speckit:taskstoissues',
    description:
      'Launches the speckit.tasks-to-issues agent to convert tasks into GitHub issues for a Spec Kit project published to GitHub',
    customAgent: 'speckit.taskstoissues',
    skillCommand: '/speckit-taskstoissues',
  })
}
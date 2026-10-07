import { createGithubCopilotAgentAction } from './common'

export function createSpecKitTasksToIssuesAction() {
  return createGithubCopilotAgentAction({
    id: 'github:copilot:speckit:taskstoissues',
    description:
      'Launches the speckit.tasks-to-issues agent to convert tasks into GitHub issues for a Spec Kit project published to GitHub',
    customAgent: 'speckit.taskstoissues',
  })
}
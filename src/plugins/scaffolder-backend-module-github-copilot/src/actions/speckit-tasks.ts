import { createGithubCopilotAgentAction } from './common'

export function createSpecKitTasksAction() {
  return createGithubCopilotAgentAction({
    id: 'github:copilot:speckit:tasks',
    description:
      'Launches the speckit.tasks agent to manage tasks for a Spec Kit project published to GitHub',
    customAgent: 'speckit.tasks',
  })
}
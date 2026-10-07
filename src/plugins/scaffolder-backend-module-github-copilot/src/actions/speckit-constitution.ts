import { createGithubCopilotAgentAction } from './common'

export function createSpecKitConstitutionAction() {
  return createGithubCopilotAgentAction({
    id: 'github:copilot:speckit:constitution',
    description:
      'Launches the speckit.constitution agent to create a constitution for a Spec Kit project published to GitHub',
    customAgent: 'speckit.constitution',
    skillCommand: '/speckit.constitution',
  })
}

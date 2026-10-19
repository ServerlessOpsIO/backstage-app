import { createGithubCopilotAgentAction } from '@internal/backstage-plugin-scaffolder-backend-module-github-copilot'

import { outputNewSpecDirectory, SPEC_DIRECTORY_OUTPUTS } from './spec-directory'

export function createSpecKitSpecifyAction() {
  return createGithubCopilotAgentAction({
    id: 'github:speckit:specify',
    description:
      'Launches the speckit.specify agent to create a feature specification for a Spec Kit project published to GitHub',
    customAgent: 'speckit.specify',
    skillCommand: '/speckit-specify',
    additionalOutputs: SPEC_DIRECTORY_OUTPUTS,
    onCompleted: outputNewSpecDirectory,
  })
}

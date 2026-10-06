# backstage-plugin-scaffolder-backend-module-github-copilot

Scaffolder backend module that adds GitHub Copilot-related actions.

## Actions

### `github:copilot:agent:launch`

Launches a GitHub Copilot agent task for a repository. Use `customAgent` to
select a custom Copilot agent profile configured for the repository:

```yaml
steps:
  - id: launchCopilot
    name: Launch Copilot agent
    action: github:copilot:agent:launch
    input:
      repoUrl: ${{ parameters.repoUrl }}
      prompt: Implement the requested change
      customAgent: security-reviewer
```

### `github:copilot:speckit:init`

Initializes Spec Kit in the generated project workspace. Add it to a scaffolder
template after the project files have been generated:

```yaml
steps:
  - id: initializeSpecKit
    name: Initialize Spec Kit
    action: github:copilot:speckit:init
```

The action runs `specify init --non-interactive --force .` from the project
root. The scaffolder task runtime must have the `specify` executable on its
`PATH`; a missing executable or unsuccessful command fails the step.

### `github:copilot:speckit:constitution`

Launches a Copilot task to create a project constitution using the
`speckit.constitution` agent. Run this action **after** initializing Spec Kit and
publishing the generated project to GitHub. The repository must have the
`speckit.constitution` custom agent profile available.

```yaml
steps:
  - id: initializeSpecKit
    name: Initialize Spec Kit
    action: github:copilot:speckit:init

  - id: publish
    name: Publish project
    action: publish:github
    input:
      repoUrl: ${{ parameters.repoUrl }}

  - id: createConstitution
    name: Create project constitution
    action: github:copilot:speckit:constitution
    input:
      repoUrl: ${{ parameters.repoUrl }}
      prompt: This is an AWS serverless REST API written in Python...
```

The action requires `repoUrl` in Backstage format and a non-empty `prompt`
describing the project's principles. It also accepts `baseRef`, `model`,
`createPullRequest`, and `userCredentialsSecretKey`, with the same defaults as
`github:copilot:agent:launch`. The agent is always `speckit.constitution` and cannot
be overridden.

Configure `requestUserCredentials` on the template's repository picker to store a
GitHub user token in the `USER_GITHUB_TOKEN` secret, or set
`userCredentialsSecretKey` to the secret key used by your template.

The action returns optional `taskId` and `taskUrl` outputs. It launches the task
asynchronously; a successful scaffolder step does not mean that constitution
creation or the pull request has completed.

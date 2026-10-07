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

The action accepts these inputs:

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `repoUrl` | Yes | | GitHub repository in Backstage `repoUrl` format, for example `github.com?owner=my-org&repo=my-repo`. Only `github.com` is supported. |
| `prompt` | Yes | | Prompt for the Copilot agent. Must not be empty. |
| `customAgent` | No | | Name of a custom Copilot agent profile to use. |
| `baseRef` | No | Repository default branch | Branch the Copilot task starts from. |
| `model` | No | `auto` | Model to use for the Copilot task. |
| `createPullRequest` | No | `true` | Whether the Copilot task opens a pull request. |
| `userCredentialsSecretKey` | No | `USER_GITHUB_TOKEN` | Key of the task secret that holds the GitHub user token. |

The action calls GitHub as the user running the template, so it needs a GitHub
user token. Configure `requestUserCredentials` in the template to store the token
in the `USER_GITHUB_TOKEN` secret, or set `userCredentialsSecretKey` to the secret
key your template uses.

The action returns optional `taskId` and `taskUrl` outputs. It launches the task
asynchronously, so a successful scaffolder step does not mean that the Copilot
task or its pull request has completed.

### `github:copilot:speckit:init`

Initializes [Spec Kit](https://github.com/github/spec-kit) with the Copilot
integration in the generated project workspace. Add it to a scaffolder template
after the project files have been generated:

```yaml
steps:
  - id: initializeSpecKit
    name: Initialize Spec Kit
    action: github:copilot:speckit:init
```

The action runs
`specify init --integration copilot --integration-options="--commands" --non-interactive --force .`
from the project root. The scaffolder task runtime must have the `specify`
executable on its `PATH`. A missing executable or unsuccessful command fails the
step.

### Spec Kit agent actions

These actions launch a Copilot task that runs one of the Spec Kit commands on a
repository. Each action is tied to one Spec Kit command, which cannot be
overridden.

| Action | Skill command | Custom agent | Purpose |
| --- | --- | --- | --- |
| `github:copilot:speckit:constitution` | `/speckit.constitution` | `speckit.constitution` | Create the project constitution: the principles that guide development. |
| `github:copilot:speckit:specify` | `/speckit.specify` | `speckit.specify` | Create a feature specification from a description of the feature. |
| `github:copilot:speckit:clarify` | `/speckit.clarify` | `speckit.clarify` | Clarify underspecified areas of the feature specification. |
| `github:copilot:speckit:checklist` | `/speckit.checklist` | `speckit.checklist` | Generate a quality checklist for the feature specification. |
| `github:copilot:speckit:plan` | `/speckit.plan` | `speckit.plan` | Create a technical implementation plan for the feature. |
| `github:copilot:speckit:tasks` | `/speckit.tasks` | `speckit.tasks` | Break the plan into tasks. |
| `github:copilot:speckit:analyze` | `/speckit.analyze` | `speckit.analyze` | Check consistency and coverage across the spec, plan, and tasks. |
| `github:copilot:speckit:taskstoissues` | `/speckit.taskstoissues` | `speckit.taskstoissues` | Convert the tasks into GitHub issues. |
| `github:copilot:speckit:implement` | `/speckit.implement` | `speckit.implement` | Implement the feature tasks. |
| `github:copilot:speckit:converge` | `/speckit.converge` | `speckit.converge` | Converge the feature artifacts. |

Run these actions **after** initializing Spec Kit and publishing the generated
project to GitHub.

Use the `integrationType` input to choose how the Spec Kit command runs:

- `skill` (default): launches Copilot without a custom agent and puts the
  action's skill command in front of your prompt. For example,
  `github:copilot:speckit:constitution` with the prompt `Emphasize testing` sends
  `/speckit.constitution Emphasize testing`.
- `agent`: launches the action's custom agent and sends your prompt unchanged.
  The repository must have the matching custom agent profile available, which
  `github:copilot:speckit:init` sets up.

Use the `prompt` input to describe the project principles for `constitution`,
the feature for `specify`, or extra guidance for the other commands. The actions
accept the same inputs as `github:copilot:agent:launch`, except `customAgent`,
and return the same `taskId` and `taskUrl` outputs. The same GitHub user token
requirement applies.

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
      # Optional: run the speckit.constitution custom agent instead of the skill
      # integrationType: agent
```

Each action starts a separate Copilot task and returns as soon as the task is
launched. The scaffolder does not wait for one task to finish before starting the
next. Spec Kit commands build on each other's output, such as `plan` reading the
specification that `specify` creates. A template should usually launch only one
Spec Kit action, and later steps should be run after its pull request is
merged.

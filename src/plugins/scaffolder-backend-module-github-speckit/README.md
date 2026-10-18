# @internal/backstage-plugin-scaffolder-backend-module-github-speckit

Scaffolder backend module that adds [GitHub Spec Kit](https://github.com/github/spec-kit)
actions.

The Spec Kit agent actions launch GitHub Copilot cloud agent tasks with the
Copilot task launcher from
`@internal/backstage-plugin-scaffolder-backend-module-github-copilot`, so this
module depends on that one.

## Actions

### `github:speckit:init`

Initializes [Spec Kit](https://github.com/github/spec-kit) in the generated project
workspace. Add it to a scaffolder template after the project files have been
generated:

```yaml
steps:
  - id: initializeSpecKit
    name: Initialize Spec Kit
    action: github:speckit:init
    input:
      # Optional: copilot (default), claude, or codex
      integration: copilot
      # Optional: skills (default) or commands
      integrationOptions: commands
```

Use the `integration` input to choose which AI coding agent Spec Kit is set up
for. The supported values are `copilot`, `claude`, and `codex`, and the default is
`copilot`. Any other value fails the step.

Use the `integrationOptions` input to choose how Spec Kit installs its commands
for the `copilot` integration:

- `skills` (default): installs the commands as skills under `.github/skills/`.
- `commands`: installs the commands as custom agents in `.github/agents/`, with
  matching prompt files in `.github/prompts/`.

Only the `copilot` integration supports `commands`. Setting `integrationOptions:
commands` with `claude` or `codex` fails the step, and `skills` has no effect for
them.

For the `copilot` integration, the action runs
`specify init --integration copilot --integration-options=--<integrationOptions> --non-interactive --force .`
from the project root. For `claude` and `codex`, it runs
`specify init --integration <integration> --non-interactive --force .`. The scaffolder task runtime must have the `specify`
executable on its `PATH`. A missing executable or unsuccessful command fails the
step.

The Spec Kit agent actions below launch GitHub Copilot tasks, so they work with
projects initialized with the `copilot` integration.

### `github:speckit:workflow`

Runs a [Spec Kit workflow](https://github.com/github/spec-kit) in the generated
project workspace. Like `github:speckit:init`, it runs Spec Kit on the
scaffolder host rather than launching a Copilot cloud agent task. Pass the
workflow's YAML content in the `workflow` input, and values for the inputs the
workflow declares in `inputs`:

```yaml
steps:
  - id: initializeSpecKit
    name: Initialize Spec Kit
    action: github:speckit:init

  - id: specifyAndPlan
    name: Specify and plan
    action: github:speckit:workflow
    input:
      workflow: |
        schema_version: "1.0"
        workflow:
          id: specify-plan
          name: Specify and plan
          version: 1.0.0
        inputs:
          spec:
            type: string
            required: true
        steps:
          - id: specify
            command: speckit.specify
            integration: auto
            input:
              args: "{{ inputs.spec }}"
          - id: plan
            command: speckit.plan
            integration: auto
            input:
              args: "{{ inputs.spec }}"
      inputs:
        spec: ${{ parameters.feature }}
```

The action accepts these inputs:

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `workflow` | Yes | | Content of the Spec Kit workflow YAML. |
| `inputs` | No | | Values for the workflow's inputs, by input name. Strings, numbers, and booleans are accepted. |
| `userCredentialsSecretKey` | No | `USER_GITHUB_TOKEN` | Key of the task secret that holds the GitHub token for the agent CLIs the workflow runs. |

The action writes the YAML to a temporary file outside the workspace and runs
`specify workflow run <file> --input <name>=<value> ... --json` from the
project root. It returns the `runId` and `status` outputs.

- The step fails unless the run's status is `completed`, including when a step
  fails or Spec Kit can't load the workflow.
- Gate steps pause a run until someone answers them, which can't happen in a
  scaffolder task, so a paused run fails the step. Leave gate steps out of
  workflows run with this action.
- The step log shows Spec Kit's output as it runs, including the output of
  the agent CLIs that command steps start. Spec Kit only records the output of
  other steps, such as shell steps, so the action adds each step's result and
  recorded output to the log when the run ends.
- Spec Kit saves each run's state under `.specify/workflows/runs/<runId>/` so a
  run can be resumed. Scaffolder tasks can't resume a run, so the action deletes
  that state from the workspace afterwards, whether the run succeeded or not,
  and a later publish step doesn't commit it.

The scaffolder task runtime must have the `specify` executable on its `PATH`,
and the workspace must already be a Spec Kit project. Command steps such as
`speckit.specify` run the integration's own CLI on the same host, for example
`copilot` for the `copilot` integration, so that CLI must also be installed
there.

The action passes the token from the `userCredentialsSecretKey` secret to those
CLIs as `GH_TOKEN`. The GitHub CLI uses it for workflow `github` steps, and the
Copilot CLI uses it for command steps, so Copilot usage is billed to the
token's owner. The Copilot CLI prefers `COPILOT_GITHUB_TOKEN` over `GH_TOKEN`,
so don't set `COPILOT_GITHUB_TOKEN` on the backend if workflows should use the
template user's token.
If you set `userCredentialsSecretKey` and the secret is missing, the step fails.
If you leave it unset and there's no `USER_GITHUB_TOKEN` secret, the CLIs use
whatever credentials the scaffolder host provides, such as a `GH_TOKEN`
environment variable on the backend. The Copilot CLI
accepts fine-grained personal access tokens with the Copilot Requests
permission, but not classic personal access tokens.

### Spec Kit agent actions

These actions launch a Copilot task that runs one of the Spec Kit commands on a
repository. Each action is tied to one Spec Kit command, which cannot be
overridden.

| Action | Skill command | Custom agent | Purpose |
| --- | --- | --- | --- |
| `github:speckit:constitution` | `/speckit.constitution` | `speckit.constitution` | Create the project constitution: the principles that guide development. |
| `github:speckit:specify` | `/speckit.specify` | `speckit.specify` | Create a feature specification from a description of the feature. |
| `github:speckit:clarify` | `/speckit.clarify` | `speckit.clarify` | Clarify underspecified areas of the feature specification. |
| `github:speckit:checklist` | `/speckit.checklist` | `speckit.checklist` | Generate a quality checklist for the feature specification. |
| `github:speckit:plan` | `/speckit.plan` | `speckit.plan` | Create a technical implementation plan for the feature. |
| `github:speckit:tasks` | `/speckit.tasks` | `speckit.tasks` | Break the plan into tasks. |
| `github:speckit:analyze` | `/speckit.analyze` | `speckit.analyze` | Check consistency and coverage across the spec, plan, and tasks. |
| `github:speckit:taskstoissues` | `/speckit.taskstoissues` | `speckit.taskstoissues` | Convert the tasks into GitHub issues. |
| `github:speckit:implement` | `/speckit.implement` | `speckit.implement` | Implement the feature tasks. |
| `github:speckit:converge` | `/speckit.converge` | `speckit.converge` | Converge the feature artifacts. |

Run these actions **after** initializing Spec Kit and publishing the generated
project to GitHub.

Use the `integrationType` input to choose how the Spec Kit command runs:

- `skill` (default): launches Copilot without a custom agent and puts the
  action's skill command in front of your prompt. For example,
  `github:speckit:constitution` with the prompt `Emphasize testing` sends
  `/speckit-constitution Emphasize testing`.
- `agent`: launches the action's custom agent and sends your prompt unchanged.
  The repository must have the matching custom agent profile available, which
  `github:speckit:init` sets up.

Use the `prompt` input to describe the project principles for `constitution`,
the feature for `specify`, or extra guidance for the other commands. The actions
accept the same inputs as `github:copilot:agent:launch` from the
`@internal/backstage-plugin-scaffolder-backend-module-github-copilot` module,
except `customAgent`,
including `waitForCompletion`, and return the same `taskId`, `taskUrl`,
`taskState`, and `headRef` outputs. The same GitHub user token
requirement applies.

```yaml
steps:
  - id: initializeSpecKit
    name: Initialize Spec Kit
    action: github:speckit:init

  - id: publish
    name: Publish project
    action: publish:github
    input:
      repoUrl: ${{ parameters.repoUrl }}

  - id: createConstitution
    name: Create project constitution
    action: github:speckit:constitution
    input:
      repoUrl: ${{ parameters.repoUrl }}
      prompt: This is an AWS serverless REST API written in Python...
      # Optional: run the speckit.constitution custom agent instead of the skill
      # integrationType: agent
```

Each action starts a separate Copilot task. Unless `waitForCompletion` is set,
the step returns as soon as the task is launched, and the scaffolder does not
wait for one task to finish before starting the next.

Spec Kit commands build on each other's output, such as `plan` reading the
specification that `specify` creates. Waiting for a task to complete is not
enough for the next command to see its output: each task starts from `baseRef`,
or the repository default branch, and the previous task's changes are in its
pull request until that is merged. A template should usually launch only one
Spec Kit action, and later steps should be run after its pull request is
merged.
To continue on the branch an earlier task created, pass that task's `headRef`
output as the `headRef` input of the next step, together with `baseRef`. The
next task then commits to the same branch instead of creating a new one. This
needs `waitForCompletion` on the earlier step, because the branch name is only
known once GitHub reports it.

```yaml
- id: speckit-plan
  action: github:speckit:plan
  input:
    repoUrl: ${{ parameters.repoUrl }}
    baseRef: main
    headRef: ${{ steps['speckit-specify'].output.headRef }}
    prompt: ${{ parameters.speckit_plan }}
    waitForCompletion: true
```

`github:speckit:specify` also reports the feature directory it created,
so later steps can work with the new spec. With `waitForCompletion` set, the
action compares the task's branch with `baseRef`, or the repository default
branch, and returns these outputs:

| Output | Example | Description |
| --- | --- | --- |
| `specDirectory` | `specs/20261012-143000-photo-album` | Feature directory the task added. |
| `specId` | `20261012-143000` | Timestamp or number that prefixes the directory, depending on the repository's Spec Kit `feature_numbering` setting. |
| `specName` | `photo-album` | Directory name without that prefix. |

The step fails if the branch doesn't add exactly one `specs/<directory>/spec.md`.
Without `waitForCompletion`, the action doesn't look for the spec and these
outputs aren't set.

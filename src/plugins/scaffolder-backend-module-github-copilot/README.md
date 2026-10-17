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
| `headRef` | No | | Existing branch for the Copilot task to commit to. Without it, Copilot creates a new branch from `baseRef`. GitHub uses the open pull request from `headRef` into `baseRef`, if there is one, as context for the task. |
| `model` | No | GitHub's default | Model to use for the Copilot task. The allowed models depend on the user's Copilot plan and organization policies. |
| `createPullRequest` | No | `false` | Whether the Copilot task opens a pull request. |
| `userCredentialsSecretKey` | No | `USER_GITHUB_TOKEN` | Key of the task secret that holds the GitHub user token. |
| `waitForCompletion` | No | `false` | Whether the step waits for the Copilot task to finish. |

The action calls GitHub as the user running the template, so it needs a GitHub
user token. Configure `requestUserCredentials` in the template to store the token
in the `USER_GITHUB_TOKEN` secret, or set `userCredentialsSecretKey` to the secret
key your template uses.

The action returns these optional outputs:

| Output | Description |
| --- | --- |
| `taskId` | ID of the Copilot task. |
| `taskUrl` | URL of the Copilot task on GitHub. |
| `taskState` | Last known state of the task, such as `queued` or `completed`. |
| `headRef` | Branch the Copilot task works on. |

GitHub may not report the task's branch until the task has started. Without
`waitForCompletion`, `headRef` is only set if the launch response already
includes the branch. With `waitForCompletion`, the action reads the branch from
each status check, so `headRef` is set once the task finishes, including when the
task fails.

By default, the action returns as soon as the Copilot task is launched, so a
successful scaffolder step does not mean that the task or its pull request has
completed. In that case, `taskState` is the state GitHub reported at launch,
usually `queued`.

Set `waitForCompletion: true` to make the step wait for the task to finish. The
action checks the task status every 30 seconds while the task is `queued` or
`in_progress`:

- If the task ends as `completed`, the step succeeds.
- If the task ends in any other state, such as `failed`, `idle`,
  `waiting_for_user`, `timed_out`, or `cancelled`, the step fails.
- If the task status can't be read, the step fails.

The `taskId` and `taskUrl` outputs are set before waiting starts, so they are
available in the task log even when the step fails. There is no time limit on
the wait. If the scaffolder task is cancelled, the action stops waiting.

### `github:copilot:speckit:init`

Initializes [Spec Kit](https://github.com/github/spec-kit) in the generated project
workspace. Add it to a scaffolder template after the project files have been
generated:

```yaml
steps:
  - id: initializeSpecKit
    name: Initialize Spec Kit
    action: github:copilot:speckit:init
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
including `waitForCompletion`, and return the same `taskId`, `taskUrl`,
`taskState`, and `headRef` outputs. The same GitHub user token
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
  action: github:copilot:speckit:plan
  input:
    repoUrl: ${{ parameters.repoUrl }}
    baseRef: main
    headRef: ${{ steps['speckit-specify'].output.headRef }}
    prompt: ${{ parameters.speckit_plan }}
    waitForCompletion: true
```

`github:copilot:speckit:specify` also reports the feature directory it created,
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

### `github:repo:commitFiles`

Commits files from the scaffolder workspace on top of an existing branch of a
GitHub repository, as the user running the template. Set `push` to add the
commit to the branch, for example to add generated files to the branch of a
Copilot agent task:

```yaml
steps:
  - id: commit-spec-catalog
    name: Add catalog file to spec
    action: github:repo:commitFiles
    input:
      repoUrl: ${{ parameters.repoUrl }}
      branch: ${{ steps['speckit-specify'].output.headRef }}
      sourcePath: ./spec-catalog
      targetPath: ${{ steps['speckit-specify'].output.specDirectory }}
      commitMessage: Add Backstage catalog file for spec
      push: true
```

The action accepts these inputs:

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `repoUrl` | Yes | | GitHub repository in Backstage `repoUrl` format. Only `github.com` is supported. |
| `branch` | Yes | | Existing branch the commit is based on. |
| `commitMessage` | Yes | | Message for the commit. |
| `sourcePath` | No | Workspace root | Workspace directory whose files are committed. |
| `targetPath` | No | Repository root | Repository directory the files are committed to. |
| `push` | No | `false` | Whether to move `branch` to the new commit. When `false`, the commit is created in the repository but isn't on any branch. |
| `userCredentialsSecretKey` | No | `USER_GITHUB_TOKEN` | Key of the task secret that holds the GitHub user token. |

All files are added in one commit on top of the branch, and the action returns
its SHA as the `commitSha` output whether or not it pushes. Files that already
exist at the same path are replaced. When pushing, the action doesn't
force-push, so it fails if someone else pushes to the branch while it runs. An
unpushed commit isn't reachable from any branch, so GitHub can eventually remove
it unless a later step, such as a branch or tag created from `commitSha`,
refers to it.

### `github:pullRequest:create`

Opens a pull request from a branch that already exists, as the user running the
template. Use it to open a pull request for a branch that earlier steps created,
such as the branch of a Copilot agent task:

```yaml
steps:
  - id: open-pull-request
    name: Open pull request
    action: github:pullRequest:create
    input:
      repoUrl: ${{ parameters.repoUrl }}
      head: ${{ steps['speckit-plan'].output.headRef }}
      base: main
      title: Add feature specification and plan
```

The action accepts these inputs:

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `repoUrl` | Yes | | GitHub repository in Backstage `repoUrl` format. Only `github.com` is supported. |
| `head` | Yes | | Existing branch with the changes to merge. |
| `base` | No | Repository default branch | Branch to merge the changes into. |
| `title` | Yes | | Title of the pull request. |
| `description` | No | | Body of the pull request. |
| `draft` | No | `false` | Whether to open the pull request as a draft. |
| `userCredentialsSecretKey` | No | `USER_GITHUB_TOKEN` | Key of the task secret that holds the GitHub user token. |

The action returns the `pullRequestUrl` and `pullRequestNumber` outputs. If a
pull request from `head` into `base` is already open, for example one a Copilot
task opened, the action returns that pull request instead of opening another.

### `github:branch:rename`

Renames a branch of a GitHub repository, as the user running the template. Use
it to give a branch an earlier step created a clearer name, such as the branch
of a Copilot agent task:

```yaml
steps:
  - id: rename-branch
    name: Rename branch
    action: github:branch:rename
    input:
      repoUrl: ${{ parameters.repoUrl }}
      branch: ${{ steps['speckit-specify'].output.headRef }}
      newName: spec/${{ steps['speckit-specify'].output.specName }}
```

The action accepts these inputs:

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `repoUrl` | Yes | | GitHub repository in Backstage `repoUrl` format. Only `github.com` is supported. |
| `branch` | Yes | | Current name of the branch. |
| `newName` | Yes | | New name for the branch. |
| `userCredentialsSecretKey` | No | `USER_GITHUB_TOKEN` | Key of the task secret that holds the GitHub user token. |

The action returns the new name as the `branch` output, so later steps can refer
to the branch without repeating the name. GitHub updates open pull requests that
use the branch. The step fails if a branch with the new name already exists, or
if the user can't push to the repository.


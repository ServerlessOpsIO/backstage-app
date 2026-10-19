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

## Spec Kit actions

The `github:speckit:*` actions are in the
`@internal/backstage-plugin-scaffolder-backend-module-github-speckit` module.
The Spec Kit agent actions there are built on the same Copilot task launcher
as `github:copilot:agent:launch`, and accept the same inputs.

# Contract: `x_github:issue:create`

| Input | Required | Description |
|---|---|---|
| `repoUrl` | Yes | Backstage `repoUrl` format; only `github.com` |
| `title` | Yes | Issue title |
| `body` | Yes | Markdown body |
| `labels` | No | String array of labels |
| `userCredentialsSecretKey` | No | Defaults to `USER_GITHUB_TOKEN` |

| Output | Description |
|---|---|
| `issueUrl` | HTML URL of the issue |
| `issueNumber` | Issue number |

Behavior: acts as the user; appends a hidden `<!-- spec-key: <task-id> -->` marker derived from the scaffolder task ID, returning the matching issue on a retry of the same run and creating a new issue for a new run; throws `Failed to create issue in <owner>/<repo>: <message>` on API failure; never closes or links the issue to closing keywords.

Template usage:

```yaml
- id: fileIssue
  action: x_github:issue:create
  input:
    repoUrl: ${{ parameters.repoUrl }}
    title: ${{ parameters.specTitle }}
    labels: ['${{ parameters.specType }}']
    body: |
      ${{ parameters.storySentence }}

      ##Proposed Solution
      ${{ parameters.proposedSolution }}

      ##Additional Context
      ${{ parameters.additionalContext }}

      ##Acceptance Criteria
      ${{ parameters.acceptanceCriteria }}
```

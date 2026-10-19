# @internal/backstage-plugin-scaffolder-backend-module-github

Scaffolder backend module that adds GitHub actions to
[@backstage/plugin-scaffolder-backend](https://www.npmjs.com/package/@backstage/plugin-scaffolder-backend),
alongside the ones from `@backstage/plugin-scaffolder-backend-module-github`.
The actions call GitHub as the user running the template, so templates need to
request their GitHub token with `requestUserCredentials`.

## Actions

### `x_github:clone`

Clones a GitHub repository into the workspace as a git repository, with its
history, as the user running the template. Unlike `fetch:plain`, which only
downloads files, the clone can be committed to and pushed with `x_github:commit`
and `x_github:push`:

```yaml
steps:
  - id: clone
    name: Clone repository
    action: x_github:clone
    input:
      repoUrl: github.com?owner=my-org&repo=my-service
```

The action accepts these inputs:

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `repoUrl` | Yes | | GitHub repository in Backstage `repoUrl` format. Only `github.com` is supported. |
| `branch` | No | Repository default branch | Branch to clone and check out. |
| `targetPath` | No | Workspace root | Workspace directory to clone into. |
| `depth` | No | `1` | Number of commits of history to fetch. |
| `userCredentialsSecretKey` | No | `USER_GITHUB_TOKEN` | Key of the task secret that holds the GitHub user token. |

The action clones only the chosen branch, and by default only its latest
commit. That's enough to commit on top of it and push with `x_github:push`.
Increase `depth` if later steps need more history. It returns the `branch` and
`commitSha` outputs for the checkout. The clone's `origin` remote is the plain
HTTPS URL; the token is only used to fetch and isn't stored in the clone. The
action uses Backstage's built-in git client, so it doesn't need the `git`
executable.

### `x_github:commitFiles`

Commits files from the scaffolder workspace on top of an existing branch of a
GitHub repository, as the user running the template. Set `push` to add the
commit to the branch, for example to add generated files to the branch of a
Copilot agent task:

```yaml
steps:
  - id: commit-spec-catalog
    name: Add catalog file to spec
    action: x_github:commitFiles
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

### `x_github:pr:create`

Opens a pull request from an existing branch of a GitHub repository, as the
user running the template. Use it after `x_github:push` to propose the pushed
changes:

```yaml
steps:
  - id: open-spec-pr
    name: Open spec pull request
    action: x_github:pr:create
    input:
      repoUrl: github.com?owner=${{ parameters.github_org }}&repo=my-service
      head: ${{ steps['push-spec-branch'].output.branch }}
      title: Add spec and plan
```

The action accepts these inputs:

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `repoUrl` | Yes | | GitHub repository in Backstage `repoUrl` format. Only `github.com` is supported. |
| `head` | Yes | | Existing branch with the changes to merge. |
| `title` | Yes | | Title of the pull request. |
| `base` | No | Repository default branch | Branch to merge the changes into. |
| `description` | No | | Body of the pull request. |
| `draft` | No | `false` | Whether to open the pull request as a draft. |
| `labels` | No | | Labels to add to the pull request. Labels the repository doesn't have yet are created. |
| `userCredentialsSecretKey` | No | `USER_GITHUB_TOKEN` | Key of the task secret that holds the GitHub user token. |

If a pull request from `head` into `base` is already open, for example one a
Copilot agent task opened, the action returns that one instead of opening
another, and leaves its title and description unchanged. Any `labels` are
added to that pull request alongside the ones it already has. It returns the
`pullRequestUrl` and `pullRequestNumber` outputs. The `head` branch must be in
the same repository; pull requests from forks aren't supported.

### `x_github:pr:comment`

Posts a comment on a pull request, as the user running the template. Use it
after `x_github:pr:create`, for example to ask Copilot to work on the pull
request:

```yaml
steps:
  - id: clarify-spec
    name: Ask Copilot to clarify the spec
    action: x_github:pr:comment
    input:
      repoUrl: github.com?owner=${{ parameters.github_org }}&repo=my-service
      pullRequestNumber: ${{ steps['open-spec-pr'].output.pullRequestNumber }}
      body: '@copilot /speckit-clarify'
```

The action accepts these inputs:

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `repoUrl` | Yes | | GitHub repository in Backstage `repoUrl` format. Only `github.com` is supported. |
| `pullRequestNumber` | Yes | | Number of the pull request to comment on. |
| `body` | Yes | | Markdown text of the comment. |
| `userCredentialsSecretKey` | No | `USER_GITHUB_TOKEN` | Key of the task secret that holds the GitHub user token. |

The comment goes on the pull request's conversation, not on a line of its
diff. The action returns the `commentUrl` and `commentId` outputs. Copilot only
responds to `@copilot` mentions from users who can write to the repository.

### `x_github:commit`

Commits every change in the workspace's git repository, including new and
deleted files, on the branch that's checked out. Use it after steps that change
a repository cloned into the workspace, before `x_github:push`:

```yaml
steps:
  - id: commit-spec
    name: Commit spec changes
    action: x_github:commit
    input:
      commitMessage: Add spec and plan
      gitAuthorName: ${{ user.entity.spec.profile.displayName }}
      gitAuthorEmail: ${{ user.entity.spec.profile.email }}
```

The action accepts these inputs:

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `commitMessage` | Yes | | Message for the commit. |
| `gitAuthorName` | No | git's configured name | Name of the commit author. |
| `gitAuthorEmail` | No | git's configured email | Email of the commit author. |

The action returns the `commitSha` output, and `committed`, which is `false`
when there was nothing to commit. In that case it makes no commit and
`commitSha` is the current commit. The commit only exists in the workspace
until a later step pushes it. The scaffolder host needs the `git` executable on
its `PATH`, and git needs an author name and email, either from these inputs or
from its configuration.

### `x_github:push`

Pushes the commits of a branch in the workspace's git repository to GitHub,
through the GitHub API rather than git's own protocol, as the user running the
template. It only pushes; commit the changes in an earlier step.

```yaml
steps:
  - id: push-spec-branch
    name: Push spec branch
    action: x_github:push
    input:
      repoUrl: github.com?owner=${{ parameters.github_org }}&repo=my-service
      branch: spec/${{ steps['speckit-workflow'].output.specName }}
```

The action accepts these inputs:

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `repoUrl` | Yes | | GitHub repository in Backstage `repoUrl` format. Only `github.com` is supported. |
| `branch` | No | Branch checked out in the workspace | Branch to push to on GitHub. Created if it doesn't exist. |
| `userCredentialsSecretKey` | No | `USER_GITHUB_TOKEN` | Key of the task secret that holds the GitHub user token. |

The action finds the local commits GitHub doesn't have yet, using the clone's
remote-tracking branches and the branch's current tip on GitHub. It recreates
each one on GitHub, oldest first, with the same files, author, committer, dates,
and message, so they normally keep the same SHAs. It then creates the branch or
moves it to the new tip, and returns the `branch` and `commitSha` outputs.

- The push isn't forced, so it fails if the branch on GitHub has commits the
  workspace doesn't have.
- If the branch on GitHub is already at the workspace's commit, the action does
  nothing.
- GitHub can't recreate signed commits with their signatures, so those get new
  SHAs, and the action logs a warning for each one. `commitSha` is always the
  SHA on GitHub.
- The workspace must be a git clone of the repository, so the history the new
  commits build on is already on GitHub. The action fails if a commit's parent
  isn't on GitHub.

The action reads the local repository with the `git` executable, so the
scaffolder host needs `git` on its `PATH`, but it doesn't use git for network
access.

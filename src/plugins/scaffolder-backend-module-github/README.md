# @internal/backstage-plugin-scaffolder-backend-module-github

Scaffolder backend module that adds GitHub actions to
[@backstage/plugin-scaffolder-backend](https://www.npmjs.com/package/@backstage/plugin-scaffolder-backend),
alongside the ones from `@backstage/plugin-scaffolder-backend-module-github`.
The actions call GitHub as the user running the template, so templates need to
request their GitHub token with `requestUserCredentials`.

## Actions

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

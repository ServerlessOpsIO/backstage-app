# CI/CD pipeline

## Workflow triggers

| Workflow | Automatic trigger | Ignores | Manual trigger |
| --- | --- | --- | --- |
| `.github/workflows/main.yml` (`Main`) | Push to `main` | `docs/**`, `specs/**` | `workflow_dispatch` |
| `.github/workflows/branch.yml` (`Branch`) | Push to any branch except `main` | `docs/**`, `specs/**` | `workflow_dispatch` |
| `.github/workflows/techdocs-docs.yml` (`Techdocs - Docs`) | Push to any branch touching `docs/**`, `mkdocs.yml`, or the workflow | | `workflow_dispatch` |
| `.github/workflows/techdocs-specs.yml` (`Techdocs - Specs`) | Push to any branch touching `specs/**` or the workflow | | `workflow_dispatch` |

There is no `pull_request` trigger; a push to a branch starts its workflow
without a PR. A push that changes only documentation or specs does not build or
deploy the application. A push that changes both starts both kinds of workflow.

Dispatching `Main` from any ref **deploys** that ref.

All jobs run on `ubuntu-latest`. Jobs that use AWS grant `id-token: write` for
OIDC role assumption.

## Jobs in `Main` and `Branch`

| Job | `main.yml` | `branch.yml` |
| --- | --- | --- |
| `build_infra` | Yes | Yes |
| `build_container` | Yes | Yes |
| `deploy` | Yes, after both build jobs | No |

## Infrastructure build job (`build_infra`)

1. `ServerlessOpsIO/gha-setup-workspace@v2` sets up the checked-out workspace.
2. `ServerlessOpsIO/gha-assume-aws-credentials@v1` obtains credentials using
   `AWS_CICD_ACCOUNT_ID`.
3. `aws-actions/setup-sam@v3` installs SAM.
4. `sam validate --lint` validates the template.
5. `sam build --parallel --template template.yaml` builds the SAM artifact.
6. `ServerlessOpsIO/gha-store-artifacts@v2` stores the build output for the
   deploy job.

## Container image build job (`build_container`)

Runs in parallel with `build_infra`:

1. Sets up the workspace and assumes credentials in the CI/CD account.
2. `ServerlessOpsIO/gha-setup-node@v1` sets up Node.js from the version in
   `src/package.json`, with `src/` as its working directory.
3. Writes the GitHub App credentials and the Google service-account keys into
   `src/app-config.d/credentials/`, then converts the Google keys to JSON with
   `yq`. See [Configuration](03-configuration.md#credential-files).
4. `yarn run tsc:full` type-checks the whole workspace.
5. `yarn run build:all` builds every package, including the backend bundle.
6. `yarn run test:all` runs all tests with coverage.
7. `yarn run lint:all` lints every package.
8. `yarn run build-image` builds the base image `backstage:latest`.
9. `kciter/aws-ecr-action@v4` builds `src/Dockerfile` on top of the base image,
   creates the ECR repository `<owner>/<repository>` in the CI/CD account if
   needed, pushes the tags below, and applies
   `.github/workflows/ecr-policy.json` as the repository policy.

A failure in any step stops the image build and, on `main`, the deployment.

| Workflow | Image tags pushed |
| --- | --- |
| `main.yml` | `latest`, branch slug, short SHA, full SHA |
| `branch.yml` | branch slug, short SHA, full SHA |

The deployment always uses the **full commit SHA** tag. Branch builds publish
images to the same repository but never move `latest`.

The two workflows read the GitHub App credentials from different secrets:
`X_GITHUB_APP_CREDS_SERVERLESSOPS` on `main` and `X_GITHUB_APP_CREDS` on other
branches. A branch image is not a byte-for-byte preview of the `main` image.

The job does not run `yarn test:config` (the home page layout test) or
`yarn test:e2e`; run those locally.

## Deploy job

`deploy` exists only in `main.yml`, depends on both build jobs, and uses the
GitHub environment **`production`**.

1. The workspace action runs with `checkout_artifact: true` to retrieve the
   build artifact.
2. The credential action receives both `AWS_CICD_ACCOUNT_ID` and
   `DEPLOYMENT_ACCOUNT_ID`.
3. `ServerlessOpsIO/gha-deploy-aws-sam@v1` deploys with the target account ID
   and the serialized workflow environment, variables, and secrets, which it
   uses to resolve `cfn-parameters.json` and `cfn-tags.json`.

CloudFormation waits for the ECS deployment to finish. ECS starts a new task,
waits for it to pass the ALB health check, then stops the old one. If new tasks
cannot start or stay healthy, the circuit breaker rolls the service back and
the stack update fails.

Every `main` deployment changes `ContainerTag` and the `org:codeSha` tag, so
every deployment registers a new task definition and replaces the running
task, even when only the template changed.

Database migrations run inside the backend at start-up. A release that changes
the schema migrates the shared database as soon as the new task starts, before
the old task stops; a rollback does not undo migrations.

The shared actions implement artifact handling, credential assumption, and
expression resolution. Confirm the expected IAM roles, region, and stack-name
behavior against their configuration.

## TechDocs workflows

Both workflows build with `mkdocs-techdocs-core` and
`@techdocs/cli generate --no-docker`, then publish with
`@techdocs/cli publish --publisher-type awsS3` to the bucket named by the
`TECHDOCS_BUCKET` variable, using the deployment account role.

| Workflow | Builds | Publishes as |
| --- | --- | --- |
| `Techdocs - Docs` | `docs/` with the root `mkdocs.yml`. Skips when `docs/` has no Markdown. Generates a `mkdocs.yml` and a landing `index.md` when either is missing. | The entity in the root `catalog-info.yaml` |
| `Techdocs - Specs` | Each `specs/<name>/` that has a `spec.md`, with a generated `mkdocs.yml` and index. A push builds only the specs it changed; a manual run, a new branch, or a workflow change builds all. | The entity in that spec's `catalog-info.yaml` |

Published sites are stored under `<namespace>/<kind>/<name>`, and there is one
site per entity. Because the workflows run on every branch, **pushing
documentation changes to a feature branch replaces the published site** for
that entity until `main` publishes again.

Other repositories publish to the same bucket with their own copies of these
workflows. The portal reads whatever is in the bucket.

## Feature branches and stack identity

Pushing a feature branch validates the template, runs the full application
build, tests, and lint, and publishes a branch-tagged image. **It does not
deploy.** There is no preview environment.

Before adding branch deployments, settle these:

1. Stack name: `samconfig.toml` has one component-wide stack name.
2. Service name and listener rule: both are fixed, and two stacks cannot share
   priority `1` on the cluster listener.
3. Database: a branch stack must not run migrations against the production
   database.
4. URLs and OAuth redirect URIs for the branch hostname.
5. Teardown: there is no branch-deletion cleanup workflow, and ECR images
   accumulate without a lifecycle policy.

## Reviewing a deployment

Inspect the GitHub Actions logs, then the CloudFormation stack status, the ECS
service's **Deployments** and **Events**, target health, and the image tag of
the running task. Open the portal, sign in, and check the catalog and a
template. Use [Observability](06-observability.md) to follow start-up logs.

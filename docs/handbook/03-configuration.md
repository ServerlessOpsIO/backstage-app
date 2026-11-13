# Configuration

Configuration has two layers: Backstage app-config files that the backend
reads at start-up, and deployment parameters that CloudFormation turns into
the container's environment variables.

## Application configuration

| File | Used | Purpose |
| --- | --- | --- |
| `src/app-config.yaml` | Always | Base configuration: frontend extensions and home layout, catalog providers for GitHub, TechDocs, integrations, and local-development defaults. |
| `src/app-config.production.yaml` | In the container | Overrides URLs, listener, PostgreSQL, auth providers, the SQS topic, the Google and ServerlessOps catalog providers, and template locations. |
| `src/app-config.local.yaml` | Local development | Git-ignored (`*.local.yaml`). Loaded automatically by `yarn start`. |
| `src/app-config.home.yaml` | On request | An alternate `home` auth environment with database TLS disabled. Copied into the image but not loaded by its default command. |
| `src/app-config.d/scaffolders/*.yaml` | In the container | The local software templates. |
| `src/app-config.d/credentials/` | In the container | Credential files written by CI. Git-ignored. |

The container starts with
`node packages/backend --config app-config.yaml --config app-config.production.yaml`.
Later files override earlier ones key by key, but lists are replaced whole:
the production `catalog.locations` list replaces the example locations in the
base file.

Frontend behavior is mostly configuration. `app.extensions` in
`src/app-config.yaml` enables, disables, and configures pages, entity tabs,
entity cards, home widgets, and the template groups on the **Create** page.

### Catalog rules

`catalog.rules` allows `Component`, `System`, `API`, `Resource`, `Location`,
`Users`, `Group`, and `Template` from registered locations. `Domain` and `User`
are not in that list (`Users` is not a Backstage kind), so those kinds are
rejected when they come from a `catalog-info.yaml` file. Entity providers are
not subject to the rules, which is how domains and users still arrive from the
ServerlessOps catalog and Google Workspace.

## Environment variables read by app-config

The task definition sets these on the application container.

| Variable | Source parameter | Used for |
| --- | --- | --- |
| `BACKSTAGE_APP_URL`, `BACKSTAGE_BACKEND_URL` | `BackstageAppUrl`, `BackstageBackendUrl` | `app.baseUrl` and `backend.baseUrl` |
| `BACKSTAGE_BACKEND_PORT` | `ContainerPort` | Listener port |
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | `PgHost`, `PgPort`, `PgUser`, `PgPassword` | Database connection |
| `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET` | `AuthGoogle*` | Google sign-in and calendar access |
| `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET` | `AuthGithub*` | GitHub user authorization |
| `SERVERLESSOPS_CATALOG_API_URL` | `ServerlessOpsCatalogApiUrl` | ServerlessOps catalog provider |
| `SERVERLESSOPS_AUTH_ENDPOINT`, `SERVERLESSOPS_AUTH_CLIENT_ID`, `SERVERLESSOPS_AUTH_CLIENT_SECRET` | `ServerlessOpsAuth*` | Token for the catalog API |
| `SERVERLESSOPS_CATALOG_EVENTS_QUEUE_URL` | The stack's `CatalogEventsQueue` | SQS topic consumer |
| `SERVERLESSOPS_CATALOG_EVENTS_MESSAGE_LOG_LEVEL` | `CatalogEventMessageLogLevel` | Log level for received event payloads |
| `AWS_REGION` | Stack region | SQS and S3 clients |
| `TECHDOCS_BUCKET` | The stack's `TechDocsBucket` | TechDocs publisher |
| `DATADOG_SITE`, `DATADOG_API_KEY`, `DATADOG_APP_KEY` | `Datadog*` | Datadog scaffolder actions and monitors endpoint |

The base file also references `GITHUB_TOKEN`. Production replaces that
integration with the GitHub App credentials file, so the variable is only
relevant locally.

**Every value above is a plain container environment variable**, including the
database password, OAuth client secrets, and Datadog keys. `NoEcho` hides them
in CloudFormation, but anyone who can describe the task definition can read
them. See [Common tasks](07-common-tasks.md#move-a-secret-out-of-the-task-definition).

## Credential files

Two credentials are files, not environment variables, and are **baked into the
container image** by CI:

| File in the image | GitHub secret | Used by |
| --- | --- | --- |
| `/app/app-config.d/credentials/serverlessops-github-app-credentials.yaml` | `X_GITHUB_APP_CREDS_SERVERLESSOPS` on `main`; `X_GITHUB_APP_CREDS` on other branches | `integrations.github` GitHub App: catalog discovery and scaffolder publishing |
| `/app/app-config.d/credentials/google-jwt.keys.yaml` | `CATALOG_GOOGLE_JWT_KEYS` | Google Workspace catalog provider service account |

The workflow writes both files into `src/app-config.d/credentials/` before the
image build, and `src/Dockerfile` copies the directory. The image therefore
contains a GitHub App private key and a Google service-account key, and
`.github/workflows/ecr-policy.json` lets any principal in the AWS Organization
pull it. Treat the ECR repository as holding secrets. Rotating either
credential requires a new image build.

The Google provider also needs `catalog.providers.google.auth.adminAccountEmail`,
a Workspace administrator the service account impersonates, set in
`src/app-config.production.yaml`.

## Stack parameters: `cfn-parameters.json`

This file supplies the deployment action with values for the `Parameters` in
`template.yaml`.

| Parameter | Value/source | Meaning |
| --- | --- | --- |
| `Domain`, `System` | `platform`, `backstage` | Deployment metadata and SSM path prefix. |
| `Component` | `$env.GITHUB_REPOSITORY_NAME_PART_SLUG_CS` | Service name, container name, and queue name prefix. |
| `CodeBranch` | `$env.GITHUB_REF_SLUG_CS` | Task-definition family suffix, queue names, and SSM paths. |
| `ClusterName` | `/platform/backstage/backstage-cluster/main/EcsClusterName` | **SSM parameter name** resolving the cluster name. |
| `ClusterTaskIamRoleArn` | `.../EcsTaskExecutionIamRoleArn` | SSM parameter name resolving the task execution role. |
| `ClusterSecurityGroupId` | `.../ContainerSecurityGroupId` | SSM parameter name resolving the task security group. |
| `ClusterAlbListenerArn` | `.../EcsAlbListenerArn` | SSM parameter name resolving the cluster HTTPS listener. |
| `ContainerRepo`, `ContainerOrg`, `ContainerImage`, `ContainerTag` | `$secrets.AWS_ECR_REPO`, repository owner, repository name, `$env.GITHUB_SHA` | Image reference `<repo>/<org>/<image>:<tag>`. |
| `ContainerCpu`, `ContainerMemory`, `ContainerDesiredCount` | `2048`, `4096`, `1` | Task size and desired tasks. |
| `ContainerPort` | `7007` | Port mapping, target group, and `BACKSTAGE_BACKEND_PORT`. |
| `ServiceScalingTimezone`, `ServiceScaleOutCron`, `ServiceScaleInCron` | `America/New_York`, empty, empty | Scheduled scaling; empty schedules disable it. |
| `AlbRulePriority`, `AlbRulePath` | `1`, `*` | Listener rule priority and path pattern. |
| `VpcId`, `VpcSubnets` | `/org/networking/VpcId`, `/org/networking/VpcPublicSubnets` | SSM parameter names resolving the VPC and task subnets. |
| `Pg*`, `Auth*`, `Backstage*Url`, `ServerlessOps*`, `Datadog*` | `$secrets` and `$vars` expressions | Application configuration; see the table above. |
| `CatalogEventMessageLogLevel` | `debug` | `debug` or `info`. |

The `Cluster*` and `Vpc*` values are SSM parameter names, resolved by
CloudFormation through `AWS::SSM::Parameter::Value<...>` types at every
deployment. A missing parameter fails the deployment before any resource
changes.

The `$env`, `$vars`, and `$secrets` expressions are intentionally unquoted. The
file is deployment-action input, **not strict JSON** for `jq`, `json.load`, or
the SAM CLI. The same applies to `cfn-tags.json`. The workflow passes
`env_json`, `vars_json`, and `secrets_json` to
`ServerlessOpsIO/gha-deploy-aws-sam@v1` for resolution.

## Stack tags: `cfn-tags.json`

| Tag | Value |
| --- | --- |
| `org:domain` | `platform` |
| `org:system` | `backstage` |
| `org:component` | `$env.GITHUB_REPOSITORY_NAME_PART_SLUG_CS` |
| `org:codeBranch` | `$env.GITHUB_REF_SLUG_CS` |
| `org:codeSha` | `$env.GITHUB_SHA` |

CloudFormation propagates stack tags to resources that support them, and the
service propagates task-definition tags to tasks.

## GitHub secrets and variables

| Name | Kind | Used by |
| --- | --- | --- |
| `AWS_CICD_ACCOUNT_ID`, `DEPLOYMENT_ACCOUNT_ID` | Secret | AWS role assumption in every workflow |
| `AWS_ECR_REPO` | Secret | Image registry in the task definition |
| `X_GITHUB_APP_CREDS_SERVERLESSOPS`, `X_GITHUB_APP_CREDS`, `CATALOG_GOOGLE_JWT_KEYS` | Secret | Credential files written into the image |
| `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Secret | Database |
| `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`, `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET` | Secret | Auth providers |
| `SERVERLESSOPS_AUTH_CLIENT_ID`, `SERVERLESSOPS_AUTH_CLIENT_SECRET`, `SERVERLESSOPS_AUTH_ENDPOINT` | Secret | ServerlessOps catalog API |
| `DATADOG_SITE`, `DATADOG_API_KEY`, `DATADOG_APP_KEY` | Secret | Datadog Agent, scaffolder actions, and monitors endpoint |
| `BACKSTAGE_APP_URL`, `BACKSTAGE_BACKEND_URL`, `SERVERLESSOPS_CATALOG_API_URL` | Variable | Application URLs |
| `TECHDOCS_BUCKET` | Variable | TechDocs publishing workflows |

The deploy job runs in the GitHub environment `production`, so secrets and
variables may be defined there or at repository or organization level.

## Deployment prerequisites

- `backstage-cluster` deployed from `main` in the same account and region,
  with its SSM parameters under `/platform/backstage/backstage-cluster/main/`.
- SSM parameters `/org/networking/VpcId` and `/org/networking/VpcPublicSubnets`.
- A PostgreSQL database from `backstage-db`, reachable from the task security
  group, with a user that can create the per-plugin databases Backstage uses.
- The Application Auto Scaling service-linked role for ECS, if scheduled
  scaling is enabled.
- Google OAuth client with the portal's redirect URI and the Google Calendar
  API enabled; a Google service account with domain-wide delegation for the
  Admin Directory API.
- GitHub OAuth app for user authorization, and a GitHub App installed on the
  organizations for catalog discovery and publishing.
- A Datadog application key with `monitors_read`, plus whatever the scaffolder
  actions need to manage monitors and dashboards.
- AWS OIDC trust and the build and deployment roles expected by
  `ServerlessOpsIO/gha-assume-aws-credentials`.
- The `TECHDOCS_BUCKET` variable set to the bucket this stack creates; its name
  is in SSM at `/platform/backstage/backstage-app/main/TechDocsBucketName`.

Tasks run in the public subnets with `AssignPublicIp: ENABLED`, which they need
to reach ECR, GitHub, Google, and Datadog without NAT. Inbound access is
whatever the cluster's task security group allows.

## SAM settings

`samconfig.toml` sets the default stack name to `backstage-app`, enables cached
parallel builds and linting, disables changeset confirmation, and requests
`CAPABILITY_NAMED_IAM` and `CAPABILITY_AUTO_EXPAND`. Verify the final stack
name used by the shared deployment action.

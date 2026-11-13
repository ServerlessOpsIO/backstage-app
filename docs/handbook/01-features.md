# Features

## Backstage portal

The application is a Backstage app (release `1.54.6`, recorded in
`src/backstage.json`) built on the new frontend system and the new backend
system. One container serves both: the backend listens on port 7007 and the
`app-backend` plugin serves the compiled frontend from the same origin.

| Area | What users get |
| --- | --- |
| Sign-in | Google sign-in. Users must already exist in the catalog; see [Sign-in and identity](#sign-in-and-identity). |
| Home | A customizable information hub at `/`; see [Home page](#home-page). |
| Catalog | A tabbed catalog index, a **Directory** page for users and groups, and extra entity tabs. |
| Create | Software templates grouped by category, with ServerlessOps form fields and scaffolder actions. |
| Docs | TechDocs read from S3, with the reader header, search, and feedback link hidden. |
| Search | PostgreSQL-backed search over the catalog and TechDocs. |
| Notifications | Notifications and signals, including scaffolder task notifications. |
| MCP actions | Catalog, scaffolder, and auth actions exposed to MCP clients. |

## Sign-in and identity

Production offers only Google sign-in; the guest provider is disabled. A
Google account is matched to a catalog `User` by profile email, by the email's
local part, or by annotation. If no `User` entity matches, sign-in fails, so
identity depends on the Google Workspace catalog provider having run.

GitHub is configured as a second auth provider. It is not a sign-in option; the
portal uses it to act as the user on GitHub for the home page widgets and for
scaffolder actions that request the user's token.

The permission framework is enabled with the allow-all policy, so every
signed-in user can perform every action.

## Home page

The default layout, in `src/app-config.yaml`, places these widgets on a
customizable grid:

| Widget | Source |
| --- | --- |
| Search bar | Backstage search. Not removable. |
| ServerlessOps logo | Bundled image. |
| Datadog Monitors | Monitors in Alert or Warn state matching `home.datadog.query`, through the backend's `/api/datadog/monitors` endpoint. |
| Toolkit | Links to AWS access portal, GitHub, Datadog, and Google Workspace. |
| World Clocks | Local time and UTC. |
| My Systems | Catalog systems owned by the user or their groups. |
| Opened Issues, Assigned Issues, Opened Pull Requests, Review Requested Pull Requests | GitHub Search, as the signed-in user. |
| Today's Calendar | The user's primary Google Calendar. |

Users can rearrange the grid. A saved layout overrides the defaults, so new or
resized widgets only appear after **Restore defaults** or adding them from the
widget catalog. `src/app-config.test.ts` asserts the default positions and the
Toolkit links; update it with the layout.

## Catalog

Entities arrive from four sources; see
[Architecture](04-architecture.md#catalog-ingestion) for the flows.

| Source | Entities | Cadence |
| --- | --- | --- |
| GitHub organizations `ServerlessOpsIO` and `PitCrewIO` | `/catalog-info.yaml` on `main` of every repository | Every 30 minutes |
| The same organizations | `/specs/*/catalog-info.yaml` on `main`: one entity per Spec Kit spec | Every 30 minutes |
| Google Workspace | Users and groups | Every 12 hours |
| ServerlessOps catalog API | Domains, systems, resources, users, and groups | Change events as they happen, plus a full refresh every day |

The catalog index opens on domains. Component pages gain **CI/CD**,
**Activity**, **Relations**, and **Specs** tabs; the **Specs** tab lists the
component's specs and has a **Create spec** button that starts the
`1-speckit-feature` template.

## Software templates

The **Create** page groups templates into Catalog Entities, Serverless API,
Serverless Event-Driven, Containers, and Infrastructure. Three templates ship
in this repository and create domains, systems, and environments in the
ServerlessOps catalog. The rest are loaded from other repositories. See
[Plugins and templates](02-plugins-and-templates.md#registered-templates).

Templates can use local scaffolder actions for the ServerlessOps catalog,
GitHub, GitHub Copilot, Spec Kit, and Datadog. The container image includes the
`specify`, `gh`, and `copilot` command-line tools those actions run.

## ECS Fargate service

`template.yaml` defines an `AWS::ECS::TaskDefinition` and an `AWS::ECS::Service`
on the `backstage-cluster` cluster, with `awsvpc` networking, Linux, and the
`X86_64` architecture. The service name and the application container name are
the component name, `backstage-app`.

| Setting | Value |
| --- | --- |
| Task CPU / memory | 2048 / 4096 MB (`ContainerCpu`, `ContainerMemory`) |
| Desired tasks | 1 (`ContainerDesiredCount`) |
| Capacity | `FARGATE_SPOT` only |
| Deployment limits | `MaximumPercent: 400`, `MinimumHealthyPercent: 75` |
| Circuit breaker | Enabled with automatic rollback |
| Task-definition family | `<component>-<branch>` |
| Tags | ECS-managed tags enabled; tags propagate from the task definition to tasks |

With one task on Spot capacity, a Spot interruption takes the portal offline
until ECS starts a replacement. Raise the desired count or add on-demand
capacity if that is not acceptable.

## Scheduled scaling

The stack can scale the service to zero and back on a schedule. Setting
`ServiceScaleOutCron` or `ServiceScaleInCron` creates an Application Auto
Scaling target with a `ScaleOut` action (to `ContainerDesiredCount`) and a
`ScaleIn` action (to zero), evaluated in `ServiceScalingTimezone`. Both are
empty in `cfn-parameters.json`, so scheduled scaling is off and the service
keeps the desired count.

## Load balancing

The service attaches to the cluster's shared ALB:

- An IP target group on port 7007, with an HTTP health check on `/` every
  5 seconds (4-second timeout, 2 healthy / 3 unhealthy thresholds).
- A listener rule at priority `1` with path pattern `*`, so the portal receives
  all traffic on the cluster listener.
- A 30-second health-check grace period for new tasks.

The portal has no hostname or certificate of its own; `BACKSTAGE_APP_URL` and
`BACKSTAGE_BACKEND_URL` must match the hostname that reaches the cluster ALB.

## Catalog events queue

The stack owns a FIFO SQS queue and its dead-letter queue. The ServerlessOps
catalog API delivers entity change events to the queue, and the backend
consumes them to update the catalog without waiting for the next poll. The
queue's ARN, name, and URL are published to SSM for the producer to use.

## TechDocs storage

The stack owns the S3 bucket that holds published TechDocs for every component.
The task role can read it; publishing happens in GitHub Actions. The bucket
name is published to SSM.

## Datadog Agent sidecar

Each task runs a `datadog-agent` container
(`public.ecr.aws/datadog/agent:latest`, 256 CPU units, 512 MB) with
`ECS_FARGATE=true` and an `agent health` check. It is non-essential: if it
fails, the Backstage container keeps running. It collects Fargate task and
container metrics only. See [Observability](06-observability.md).

## ECS Exec

The service sets `EnableExecuteCommand: true`, but the task role in this
template does not grant the SSM Messages permissions that ECS Exec needs. Add
them before relying on interactive sessions; see
[Common tasks](07-common-tasks.md#open-a-shell-in-the-running-task).

## CI/CD and documentation

GitHub Actions builds and deploys from `main`, builds without deploying on
other branches, and publishes this handbook and the Spec Kit specs as TechDocs.
See [CI/CD pipeline](05-ci-cd.md).

# Observability

## Container logging

Both containers use the `awslogs` driver and write to one log group,
`/aws/ecs/<cluster-name>/<stack-name>`, in the deployment region:

| Stream prefix | Source |
| --- | --- |
| `app/backstage-app/<task-id>` | Backstage backend stdout and stderr |
| `sidecar/datadog-agent/<task-id>` | Datadog Agent, at `ERROR` level |

The driver creates the group on first use (`awslogs-create-group: true`), so it
is not a CloudFormation resource: it has **no retention policy** and is not
deleted with the stack. Set retention explicitly.

The backend logs JSON lines in production. Each line carries the `plugin` that
wrote it, and local modules add a `target`. The backend's level comes from the
`LOG_LEVEL` environment variable, which the task definition does not set, so
it runs at `info`.

## Useful log filters

| To find | Filter on |
| --- | --- |
| Catalog event results | `target` = `serverlessops-catalog-events`; message `Catalog event outcome=<status>` |
| Received event payloads | `target` = `serverlessops-catalog-event-processor`; message `Received catalog event message` |
| ServerlessOps catalog refreshes | `target` = `serverlessops-catalog` |
| SQS consumer problems | `Failed to receive events from AWS SQS` or `Failed to delete message from AWS SQS` |
| Datadog widget failures | `Unable to load Datadog monitors` |
| Catalog processing errors | `plugin` = `catalog`, level `warn` or `error` |
| Scaffolder task output | `plugin` = `scaffolder` |

Catalog event outcomes log at `info` for `applied`, `warn` for `rejected`, and
`error` for `failed` and `dlq-routed`. Each carries the `eventId`, `entityRef`,
`changeType`, and a `reason`.

Received payloads are logged at the level set by `CatalogEventMessageLogLevel`.
The deployed value is `debug`, which hides them at the default backend level;
set it to `info` to see full payloads without enabling debug logging
everywhere.

Never log tokens or credentials. Scaffolder tasks run with users' GitHub
tokens; keep new actions from echoing secrets into task logs.

## ECS service and task health

| Signal | Where | Meaning |
| --- | --- | --- |
| Service events | ECS console or `aws ecs describe-services` | Placement, deployment, target registration, Spot interruption, and circuit-breaker messages. |
| Stopped reason | Stopped tasks | Image-pull failures, the Backstage container exiting, Spot reclamation, and failed health checks. |
| Target health | Target group | Result of the ALB's HTTP `/` check every 5 seconds; 3 consecutive failures mark the target unhealthy. |
| Container health | Task details | Only the Datadog Agent has a health check. |

The health-check grace period is 30 seconds. The backend runs database
migrations and starts every plugin before it listens, so a slow start can
exceed it; raise `HealthCheckGracePeriodSeconds` in that case, not the check
thresholds.

`/` is served by the frontend bundle, so a healthy target shows that the
process is listening, not that the database or catalog is working. The backend
also exposes `/.backstage/health/v1/readiness` and
`/.backstage/health/v1/liveness`.

## Metrics

ECS publishes service `CPUUtilization` and `MemoryUtilization`. The ALB
publishes per-target-group `RequestCount`, `TargetResponseTime`,
`HTTPCode_Target_5XX_Count`, `HealthyHostCount`, and `UnHealthyHostCount`.

SQS publishes `ApproximateNumberOfMessagesVisible` and
`ApproximateAgeOfOldestMessage` for the events queue and its dead-letter queue.
A growing backlog on the main queue means the backend is not consuming. Any
message in the dead-letter queue deserves a look.

The stack defines no alarms, dashboards, or target-tracking autoscaling. Add
them based on how much downtime the portal can tolerate.

## Datadog

The Datadog Agent sidecar reports Fargate task and container metrics such as
`ecs.fargate.cpu.usage` and `ecs.fargate.mem.usage`. It is non-essential and
has its own health check: a task can be `RUNNING` with the agent `UNHEALTHY`.
Log forwarding from the sidecar and APM tracing are not enabled.

The application container carries no `com.datadoghq.tags.*` Docker labels in
`template.yaml`, so use the ECS and stack tags (`org:domain`, `org:system`,
`org:component`, `org:codeBranch`, `org:codeSha`) to filter. Add
`DockerLabels` to the container if unified `domain`, `system`, `component`,
and `code_branch` tags are wanted.

The agent's API key is a plain environment variable in the task definition.

After a deployment, confirm both containers are `RUNNING` and the agent is
`HEALTHY`, then check the Fargate metrics in Datadog within about ten minutes.
`specs/007-datadog-agent-sidecar/quickstart.md` has the full verification.

The same Datadog account backs the home page **Datadog Monitors** widget and
the `x_datadog:*` scaffolder actions, through the backend's API and application
keys. Those are independent of the sidecar.

## In the portal

| Page | Shows |
| --- | --- |
| Settings → Unprocessed entities | Entities that failed processing or are pending, with the error. |
| Create → task list | Scaffolder task history and step logs. |
| Settings → Visualizer | The frontend extension tree, to see what is installed, enabled, and attached where. |
| `/create/actions` | Installed scaffolder actions and their schemas. |

## Investigation checklist

1. Note the timestamp, the page or API path, and the user.
2. Determine where the request stopped: a 503 from the ALB means no healthy
   task; a sign-in error means the auth provider or the user lookup; an error
   panel inside a page means a backend plugin.
3. Check the ECS service events and stopped-task reasons for a Spot
   interruption, a crash, failed health checks, or a rolled-back deployment.
4. Read the `app` stream for the task. On start-up failures, look for the first
   error: missing configuration, an unreachable database, or a failed
   migration.
5. For missing or stale catalog entities, identify the source. GitHub and
   Google entities wait for their schedule. For ServerlessOps catalog entities,
   look for the event outcome, then the daily refresh, then **Unprocessed
   entities**.
6. For missing documentation, check that the repository's TechDocs workflow
   ran and published to the right entity, then that the object exists in the
   bucket.
7. For a failing template, open the scaffolder task log; confirm the action's
   CLI exists in the image and that the template requested the user's GitHub
   token.
8. Compare with recent deployments and the running image tag.

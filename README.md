# Backstage Application

Backstage Application and ECS Service task.

## Datadog

The ECS task runs a Datadog Agent sidecar (`datadog-agent`) next to the Backstage container to collect ECS Fargate task and container metrics.

### Configuration

Set these CI secrets (mapped in `cfn-parameters.json`):

- `DATADOG_API_KEY`: Datadog API key (`DatadogApiKey`, NoEcho)
- `DATADOG_SITE`: Datadog site, e.g. `datadoghq.com` (`DatadogSite`)

### Behavior

- The sidecar is non-essential: if it fails, the Backstage container keeps running.
- Metrics only. Log forwarding and APM tracing are not enabled.
- The app container carries `com.datadoghq.tags.*` Docker labels (domain, system, component, code_branch).
- Agent logs go to the stack log group with stream prefix `sidecar`.

### Verification

After deploy, confirm both containers are `RUNNING` and the agent is `HEALTHY` in the ECS console, then check `ecs.fargate.cpu.usage` / `ecs.fargate.mem.usage` in Datadog Metrics Explorer within ~10 minutes. See `specs/007-datadog-agent-sidecar/quickstart.md`.

### Follow-up

`DD_API_KEY` is currently passed as a plain container environment variable. Move it to AWS Secrets Manager via the container `Secrets:` property.

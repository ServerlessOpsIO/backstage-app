# Research

## D1 Reuse upstream sidecar definition
- **Decision**: Copy the `datadog-agent` container from the ECS template (256 CPU, 512 MiB, `agent:latest`, `ECS_FARGATE=true`, `DD_SITE`, `DD_API_KEY`, `DD_LOG_LEVEL=ERROR`, `agent health` check, awslogs prefix `sidecar`), without the `enable_datadog` Jinja guard.
- **Rationale**: User directive; spec requires Datadog always on.
- **Alternatives**: Conditional container (rejected, spec clarification); AWS CloudWatch integration (out of scope).

## D2 Non-essential sidecar
- **Decision**: `Essential: false` (not in upstream snippet; default is true).
- **Rationale**: FR-006 / US2: agent failure must not stop the task. Do not add `DependsOn` on the agent from the app.

## D3 Tags
- **Decision**: Whether CloudFormation stack tags propagate to the ECS task and appear on Datadog metrics is unknown. Do not assume stack tags or add `DD_ENV`/`DD_SERVICE` based on the specs; have a human verify the resulting metric tags after deployment.
- **Rationale**: FR-003 requires filterable service/environment tags, but the tag propagation path and Datadog representation have not been verified. If expected tags are absent, determine the required explicit tag configuration.

## D4 API key handling
- **Decision**: `Environment: DD_API_KEY: !Ref DatadogApiKey` via existing CI parameter (clarification 4). Param is `NoEcho`.
- **Rationale**: Matches upstream and the app's existing `DATADOG_API_KEY`. Residual risk: value readable in task definition. Follow-up: store in Secrets Manager and use `Secrets:`, requiring `secretsmanager:GetSecretValue` on the execution role (`ClusterTaskIamRoleArn`, owned by the cluster stack).

## D5 Resources
- **Decision**: No change to task CPU/memory (2048/4096). App container has no container-level limits, so it can use the remainder; sidecar reserves 256/512.

## D6 Logging
- **Decision**: Same log group, stream prefix `sidecar`. App log forwarding stays out of scope.

## D7 Open risk: service-level metrics
- Agent on Fargate yields `ecs.fargate.*` task/container metrics tagged with cluster/service. Desired/running counts and deployment metrics (`aws.ecs.service.*`) normally come from the AWS integration, which the spec says is not required. Verify in quickstart; if absent, spec needs clarification (not solved by config).
- **Status (post-implementation)**: Pending deployment. After deploy, check whether `aws.ecs.service.*` metrics appear; if absent, record here that spec clarification is needed (AWS integration is out of scope).

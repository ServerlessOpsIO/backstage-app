# Research

## D1 Reuse upstream sidecar definition
- **Decision**: Copy the `datadog-agent` container from the ECS template (256 CPU, 512 MiB, `agent:latest`, `ECS_FARGATE=true`, `DD_SITE`, `DD_API_KEY`, `DD_LOG_LEVEL=ERROR`, `agent health` check, awslogs prefix `sidecar`), without the `enable_datadog` Jinja guard.
- **Rationale**: User directive; spec requires Datadog always on.
- **Alternatives**: Conditional container (rejected, spec clarification); AWS CloudWatch integration (out of scope).

## D2 Non-essential sidecar
- **Decision**: `Essential: false` (not in upstream snippet; default is true).
- **Rationale**: FR-006 / US2: agent failure must not stop the task. Do not add `DependsOn` on the agent from the app.

## D3 Tags
- **Decision**: Add `DockerLabels` (`com.datadoghq.tags.domain/system/component/code_branch`) to the app container as upstream does; add `DD_TAGS` (`env:<CodeBranch>`) is optional—use `DD_ENV` only if consistent with specs 003/004 tag conventions (verify during tasks). Service tag from `Component`.
- **Rationale**: FR-003; agent reads docker labels from task metadata. The app container currently has none.

## D4 API key handling
- **Decision**: `Environment: DD_API_KEY: !Ref DatadogApiKey` via existing CI parameter (clarification 4). Param is `NoEcho`.
- **Rationale**: Matches upstream and the app's existing `DATADOG_API_KEY`. Residual risk: value readable in task definition. Follow-up: store in Secrets Manager and use `Secrets:`, requiring `secretsmanager:GetSecretValue` on the execution role (`ClusterTaskIamRoleArn`, owned by the cluster stack).

## D5 Resources
- **Decision**: No change to task CPU/memory (2048/4096). App container has no container-level limits, so it can use the remainder; sidecar reserves 256/512.

## D6 Logging
- **Decision**: Same log group, stream prefix `sidecar`. App log forwarding stays out of scope.

## D7 Open risk: service-level metrics
- Agent on Fargate yields `ecs.fargate.*` task/container metrics tagged with cluster/service. Desired/running counts and deployment metrics (`aws.ecs.service.*`) normally come from the AWS integration, which the spec says is not required. Verify in quickstart; if absent, spec needs clarification (not solved by config).

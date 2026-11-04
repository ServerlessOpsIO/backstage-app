# Quickstart / Validation

1. From repo root: `sam validate --lint && sam build --parallel --template template.yaml`.
2. Confirm `DATADOG_API_KEY`/`DATADOG_SITE` secrets exist in CI; deploy via the normal workflow.
3. ECS console: new task shows both containers RUNNING; `datadog-agent` health HEALTHY.
4. Datadog Metrics Explorer (≤10 min): `ecs.fargate.cpu.usage`, `ecs.fargate.mem.usage` filtered by service/cluster tags; check desired/running counts (see research D7). Human check: confirm whether the CloudFormation stack tags appear on the ECS task and its Datadog metrics, and record the result. If expected tags are absent, follow up on explicit Datadog tag configuration.
5. Resilience: stop the `datadog-agent` container (or set a bad key); app still serves and task stays up.
6. `git grep` for the API key value: no matches.

# Quickstart / Validation

1. From repo root: `sam validate --lint && sam build --parallel --template template.yaml`.
2. Confirm `DATADOG_API_KEY`/`DATADOG_SITE` secrets exist in CI; deploy via the normal workflow.
3. ECS console: new task shows both containers RUNNING; `datadog-agent` health HEALTHY.
4. Datadog Metrics Explorer (≤10 min): `ecs.fargate.cpu.usage`, `ecs.fargate.mem.usage` filtered by the service/cluster tags; check desired/running counts (see research D7).
5. Resilience: stop the `datadog-agent` container (or set a bad key); app still serves and task stays up.
6. `git grep` for the API key value: no matches.

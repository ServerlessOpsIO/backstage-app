# Data Model

- **Task Definition** (`TaskDefinition`): containers `[Component (app, essential), datadog-agent (non-essential)]`.
- **Datadog Agent Container**: Cpu 256, Memory 512, Essential false, env `DD_API_KEY`, `DD_SITE`, `ECS_FARGATE=true`, `DD_LOG_LEVEL=ERROR`; health check `agent health` (interval 5, retries 3, start 10, timeout 5).
- **Credentials**: existing parameters `DatadogApiKey` (NoEcho), `DatadogSite`; supplied by `cfn-parameters.json` from `secrets.DATADOG_API_KEY` / `secrets.DATADOG_SITE`. No new parameters.
- **Tags**: app container DockerLabels from `Domain`, `System`, `Component`, `CodeBranch`.

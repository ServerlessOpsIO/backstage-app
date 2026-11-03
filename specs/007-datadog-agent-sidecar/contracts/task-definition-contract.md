# Task Definition Contract

1. `ContainerDefinitions` contains a container named `datadog-agent` with `Essential: false`.
2. Sum of container Cpu/Memory reservations ≤ task `ContainerCpu`/`ContainerMemory`.
3. `DD_API_KEY` is sourced only from `!Ref DatadogApiKey`; no literal keys in repo.
4. `DD_SITE` is `!Ref DatadogSite`; `ECS_FARGATE` is `"true"` (quoted string).
5. App container has `DockerLabels` for domain, system, component, code_branch.
6. App container remains the ALB target (`LoadBalancers.ContainerName` unchanged).
7. `sam validate --lint` and `sam build --parallel --template template.yaml` pass.

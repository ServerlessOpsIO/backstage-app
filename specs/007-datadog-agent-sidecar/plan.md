# Implementation Plan: Datadog Agent Sidecar for Backstage

**Branch**: `007-datadog-agent-sidecar` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-datadog-agent-sidecar/spec.md`

## Summary

Add a `datadog-agent` sidecar container to the `TaskDefinition` in the root `template.yaml`, mirroring the pattern in the ECS container template
(`ServerlessOpsIO/backstage-aws-sam-ecs-template`, `container/skeleton/template.yaml` L172-L199), minus the Jinja `enable_datadog` conditional
(spec requires Datadog on every deployment). Also add the supporting config the upstream snippet assumes: `DockerLabels` on the app container,
`Essential: false` on the sidecar, tags, and README docs. `DatadogSite` and `DatadogApiKey` parameters and CI mappings already exist.

## Technical Context

**Language/Version**: AWS SAM / CloudFormation YAML (no application code changes)

**Primary Dependencies**: `public.ecr.aws/datadog/agent` image; ECS Fargate

**Storage**: N/A

**Testing**: `sam validate --lint`, `sam build --parallel --template template.yaml`; post-deploy check in Datadog (see quickstart)

**Target Platform**: AWS ECS Fargate (X86_64, awsvpc)

**Project Type**: Infrastructure change to existing web service

**Performance Goals**: Metrics visible within 10 minutes of deploy (SC-001)

**Constraints**: Agent failure must not affect app; task is 2048 CPU / 4096 MiB, sidecar uses 256 / 512

**Scale/Scope**: One service, one task definition, one file plus docs

## Constitution Check

| Principle | Status |
|---|---|
| I. Architecture Boundaries | Pass: root SAM asset only; nothing under `src/` |
| II. Catalog Integrity | Pass: not affected |
| III. Environment-Driven Config | Pass: site/key via parameters; env/service tags derived from existing `Domain`/`System`/`Component`/`CodeBranch` params |
| IV. Secrets and Least Privilege | Pass with note: key stays a `NoEcho` parameter injected by CI (spec clarification); it is visible as a plain task-definition env var, same as the app's existing `DATADOG_API_KEY`. Moving to SSM/Secrets Manager `Secrets:` is a documented follow-up (research D4) |
| V. Validation and Deployment Integrity | Pass: `sam validate --lint` and `sam build` required; deployment impact below |

**Deployment impact**: new task definition revision rolls the service (circuit breaker + rollback already on). Sidecar is non-essential so ALB
health/target registration is unaffected. Egress to Datadog needed (public subnet with public IP already). Post-design re-check: no violations.

## Project Structure

```text
specs/007-datadog-agent-sidecar/
├── plan.md  research.md  data-model.md  quickstart.md
└── contracts/task-definition-contract.md

template.yaml   # TaskDefinition: add DockerLabels + datadog-agent container
README.md       # document Datadog config + verification (FR-008)
```

**Structure Decision**: Edit only the root `template.yaml` and README; no new files in source tree.

## Complexity Tracking

No violations.

---

description: "Task list for Datadog Agent Sidecar for Backstage"
---

# Tasks: Datadog Agent Sidecar for Backstage

**Input**: Design documents from `/specs/007-datadog-agent-sidecar/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/task-definition-contract.md, quickstart.md

**Tests**: No test tasks requested. Validation uses `sam validate --lint`, `sam build`, and post-deploy checks from quickstart.md.

**Organization**: Grouped by user story. Only `template.yaml` and `README.md` change (no `src/` changes).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

**Purpose**: Establish baseline and confirm existing configuration

- [X] T001 Run baseline `sam validate --lint && sam build --parallel --template template.yaml` from repo root and record that `template.yaml` passes before edits
- [X] T002 [P] Confirm parameters `DatadogSite` and `DatadogApiKey` (NoEcho) exist in `template.yaml` (~L169-L176) and that CI parameter mapping (`cfn-parameters.json` generation in `.github/workflows/`) maps `secrets.DATADOG_API_KEY` / `secrets.DATADOG_SITE`; add no new parameters
- [X] T003 [P] Record as unresolved whether CloudFormation stack tags propagate to the ECS task and Datadog metrics; defer the decision on explicit `DD_ENV`/`DD_SERVICE` tags to the post-deployment human verification in T018 (research D3)

---

## Phase 2: Foundational

No blocking prerequisites beyond Phase 1; infrastructure (cluster, roles, log group, parameters) already exists.

---

## Phase 3: User Story 1 - See ECS service metrics in Datadog (Priority: P1) 🎯 MVP

**Goal**: Task/container metrics and ECS service metrics tagged by service and environment appear in Datadog within 10 minutes of deploy.

**Independent Test**: Deploy, then in Datadog Metrics Explorer filter `ecs.fargate.cpu.usage` / `ecs.fargate.mem.usage` by service/cluster; data is present and tagged (quickstart steps 3-4).

- [ ] T004 [US1] In `template.yaml` `TaskDefinition.Properties.ContainerDefinitions`, add a second container `Name: datadog-agent`, `Image: public.ecr.aws/datadog/agent:latest`, `Cpu: 256`, `Memory: 512`, mirroring upstream `container/skeleton/template.yaml` L172-L199 without the Jinja `enable_datadog` guard
- [ ] T005 [US1] In the `datadog-agent` container in `template.yaml`, add `Environment`: `DD_API_KEY: !Ref DatadogApiKey`, `DD_SITE: !Ref DatadogSite`, `ECS_FARGATE: "true"` (quoted string), `DD_LOG_LEVEL: ERROR`; no literal key values
- [ ] T006 [US1] In the `datadog-agent` container in `template.yaml`, add `HealthCheck` with `Command: [CMD-SHELL, agent health]`, `Interval: 5`, `Retries: 3`, `StartPeriod: 10`, `Timeout: 5`
- [ ] T007 [US1] In the `datadog-agent` container in `template.yaml`, add `LogConfiguration` (awslogs, same group `!Sub '/aws/ecs/${ClusterName}/${AWS::StackName}'`, region `!Ref AWS::Region`, `awslogs-stream-prefix: sidecar`)
- [ ] T008 [US1] In `template.yaml`, add `DockerLabels` to the app container (`!Ref Component`): `com.datadoghq.tags.domain: !Ref Domain`, `com.datadoghq.tags.system: !Ref System`, `com.datadoghq.tags.component: !Ref Component`, `com.datadoghq.tags.code_branch: !Ref CodeBranch` (confirm the parameter names exist; contract item 5)
- [ ] T009 [US1] Do not add `DD_ENV`/`DD_SERVICE` or `DD_TAGS` based on an unverified assumption; validate the resulting metric tags after deployment in T018, then determine whether explicit tags are needed (FR-003, research D3)
- [ ] T010 [US1] Run `sam validate --lint && sam build --parallel --template template.yaml` and fix any errors in `template.yaml`
- [ ] T011 [US1] Document the service-level metrics risk (research D7): after deploy, check whether `aws.ecs.service.*` desired/running/deployment metrics appear; if not, record in `specs/007-datadog-agent-sidecar/research.md` that spec clarification is needed (AWS integration is out of scope)

**Checkpoint**: Task definition has both containers and validates; metrics verified post-deploy per quickstart.

---

## Phase 4: User Story 2 - Application keeps working if monitoring fails (Priority: P2)

**Goal**: Agent failure never stops or restarts the app container.

**Independent Test**: Stop `datadog-agent` or use a bad key; app keeps serving and task stays RUNNING (quickstart step 5).

- [ ] T012 [US2] In `template.yaml`, set `Essential: false` on the `datadog-agent` container (contract item 1; default is true)
- [ ] T013 [US2] Verify in `template.yaml` that the app container has no `DependsOn` on `datadog-agent` and that `Service.LoadBalancers.ContainerName` still targets the app container (contract item 6)
- [ ] T014 [US2] Verify in `template.yaml` that summed container `Cpu`/`Memory` (agent 256/512 plus app, which has no container limits) fits within `ContainerCpu`/`ContainerMemory` (2048/4096) (FR-007, contract item 2)
- [ ] T015 [US2] Re-run `sam validate --lint && sam build --parallel --template template.yaml` after changes

**Checkpoint**: Both stories satisfy the task-definition contract.

---

## Phase 5: Polish & Cross-Cutting

- [ ] T016 [P] Update `README.md` with a "Datadog" section: required `DATADOG_API_KEY` / `DATADOG_SITE` CI secrets, sidecar behaviour (non-essential, ECS metrics only, no log forwarding/tracing), and verification steps from quickstart (FR-008)
- [ ] T017 [P] Run `git grep` for the Datadog API key value and `DD_API_KEY` to confirm no literal key in the repo (SC-004, contract item 3)
- [ ] T018 Walk through `specs/007-datadog-agent-sidecar/quickstart.md` after deployment (both containers RUNNING, agent HEALTHY, metrics visible within 10 minutes, verify expected stack tags appear on metrics and record the human check outcome, resilience check)
- [ ] T019 [P] Note in `README.md` the follow-up to move `DD_API_KEY` to Secrets Manager `Secrets:` (research D4)

---

## Dependencies & Execution Order

- Phase 1 → Phase 3 (US1) → Phase 4 (US2) → Phase 5.
- T004 precedes T005-T007, T009, T012 (same container block in `template.yaml`; edit sequentially). T008 touches the app container and can be done anytime after T001.
- US2 edits the same file as US1, so it follows US1 rather than running in parallel.
- T016, T017, T019 are independent of each other (different files / read-only).

## Parallel Example

- T002 and T003 together in Phase 1.
- T016 and T017 together in Phase 5.

## Implementation Strategy

- **MVP**: Phase 1 + User Story 1 (T001-T011), deployable on its own.
- **Increment**: Add US2 guarantees (T012-T015), then docs and verification.
- Note: T012 is a one-line change and is safest included in the same PR as T004 so the sidecar is never deployed as essential.

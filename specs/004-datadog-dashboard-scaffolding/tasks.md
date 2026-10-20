---

description: "Task list for Scaffolder Datadog Dashboard Baseline implementation"
---

# Tasks: Scaffolder Datadog Dashboard Baseline

**Input**: Design documents from `/specs/004-datadog-dashboard-scaffolding/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Include module-level Jest coverage because the implementation plan and quickstart explicitly require package tests for the Datadog scaffolder module.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`) for story-phase tasks only
- Every task below includes concrete file path(s)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish dashboard action file layout and module wiring points.

- [ ] T001 Create dashboard action scaffolding in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.ts` and `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.test.ts`
- [ ] T002 Add dashboard action exports in `src/plugins/scaffolder-backend-module-datadog/src/actions/index.ts` and registration hook points in `src/plugins/scaffolder-backend-module-datadog/src/module.ts`
- [ ] T003 Extend module registration coverage in `src/plugins/scaffolder-backend-module-datadog/src/module.test.ts` for the dashboard action

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared action infrastructure that all user stories depend on.

**⚠️ CRITICAL**: No user story work starts until this phase is complete.

- [ ] T004 Define action-domain types and constants in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.ts` (`DashboardSelection`, `DatadogDashboardCreateRequest`, `DashboardProvisioningResult`, managed identity tag keys)
- [ ] T005 Implement Datadog runtime config loading and fail-closed checks for `scaffolder.datadog.apiKey`, `scaffolder.datadog.appKey`, and `scaffolder.datadog.site` in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.ts`
- [ ] T006 Implement Datadog dashboard API client helpers (lookup/create/update) in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.ts`
- [ ] T007 [P] Implement baseline catalog and baseline resolver in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/baselines.ts`
- [ ] T008 Integrate baseline resolver + payload builder flow in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.ts`

**Checkpoint**: Foundation ready — user story implementation can proceed.

---

## Phase 3: User Story 1 - Scaffold projects with default dashboards (Priority: P1) 🎯 MVP

**Goal**: Scaffold runs create/update Datadog dashboards for a stable project key without duplicates and emit per-dashboard outcomes.

**Independent Test**: Execute one scaffold request with a valid `projectKey` and one dashboard selection, then rerun the same request and verify first-run `created`, retry `updated`, and no duplicate dashboard creation.

- [ ] T009 [US1] Add create/update idempotency tests in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.test.ts` for first-run create and retry update outcomes
- [ ] T010 [US1] Implement `x_datadog:dashboard:create` action schema and handler input/output contract in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.ts`
- [ ] T011 [US1] Implement per-dashboard provisioning loop (create or update by logical identity, retain successful outcomes) in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.ts`
- [ ] T012 [US1] Finalize action registration/export wiring in `src/plugins/scaffolder-backend-module-datadog/src/actions/index.ts` and `src/plugins/scaffolder-backend-module-datadog/src/module.ts`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Template authors define dashboard baselines (Priority: P2)

**Goal**: Template authors can select reusable baselines and provide project-specific display values for one or more dashboards in a single run.

**Independent Test**: Execute one scaffold request containing multiple dashboard selections with different `baselineId` and `templateVariables`; confirm all selections are processed and payloads reflect template-provided display values.

- [ ] T013 [US2] Add multi-dashboard baseline-selection tests in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.test.ts`
- [ ] T014 [US2] Implement baseline-to-dashboard composition (merge baseline content with `name`, `description`, `tags`, and `templateVariables`) in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.ts`
- [ ] T015 [P] [US2] Update action contract examples for baseline selection in `specs/004-datadog-dashboard-scaffolding/contracts/scaffolder-action.md`
- [ ] T016 [P] [US2] Replace “planned” dashboard action README content with implemented usage/configuration in `src/plugins/scaffolder-backend-module-datadog/README.md`

**Checkpoint**: User Stories 1 and 2 are independently functional.

---

## Phase 5: User Story 3 - Invalid dashboard definitions fail clearly (Priority: P3)

**Goal**: Invalid requests fail with dashboard-specific, actionable errors while preserving successful dashboard operations in mixed-result runs.

**Independent Test**: Execute invalid requests (missing required fields, duplicate names, unmanaged ownership conflict) and verify the step fails with index/name-specific messages and reported partial successes.

- [ ] T017 [US3] Add validation coverage for missing required fields and duplicate names in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.test.ts`
- [ ] T018 [US3] Add unmanaged-dashboard ownership collision coverage in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.test.ts`
- [ ] T019 [US3] Implement top-level request validation in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.ts` with quoted constraints: `projectKey` = "Non-empty stable project key used across retries", `dashboards` = "`minItems = 1`; duplicate `name` values rejected"
- [ ] T020 [US3] Implement per-selection validation in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.ts` with quoted constraints: `name` = "Non-empty dashboard display name; unique per request for a given `projectKey`", `baselineId` = "Non-empty; must map to a known reusable baseline", `description` = "Optional non-empty display description override", `tags` = "Optional additional Datadog dashboard tags", `templateVariables` = "Optional substitutions for baseline-declared variables"
- [ ] T021 [US3] Implement failure reporting semantics in `src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.ts` (per-dashboard `status` with index/name context and step-level failure summary)
- [ ] T022 [US3] Document validation and ownership failure troubleshooting in `src/plugins/scaffolder-backend-module-datadog/README.md`

**Checkpoint**: All user stories are independently functional and failures are actionable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, validation, and documentation alignment across the feature.

- [ ] T023 [P] Reconcile final action exports/registration assertions for both Datadog actions in `src/plugins/scaffolder-backend-module-datadog/src/actions/index.ts` and `src/plugins/scaffolder-backend-module-datadog/src/module.test.ts`
- [ ] T024 [P] Align verification guidance and expected outcomes in `specs/004-datadog-dashboard-scaffolding/quickstart.md`
- [ ] T025 Run package and repository validation commands and capture any command/document corrections in `src/plugins/scaffolder-backend-module-datadog/README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2 and builds on US1 action flow.
- **Phase 5 (US3)**: Depends on Phase 2 and validates final behavior of US1/US2 implementation.
- **Phase 6 (Polish)**: Depends on completion of desired user stories.

### User Story Dependencies

- **US1 (P1)**: Starts immediately after Foundational; MVP slice.
- **US2 (P2)**: Starts after Foundational, but should be implemented after US1 because it extends the dashboard action’s baseline composition behavior.
- **US3 (P3)**: Starts after Foundational, but should validate the completed US1/US2 implementation to ensure clear failure semantics.

### Within Each User Story

- Add/adjust story tests before finalizing implementation behavior in the same story.
- Implement core action behavior before docs updates for that story.
- Keep each story independently runnable and verifiable via its independent test criteria.

---

## Parallel Opportunities

- **Foundational**: `T007` can run in parallel with `T004`–`T006` after file scaffolding exists.
- **US2**: `T015` and `T016` can run in parallel after `T014` stabilizes implemented behavior.
- **Polish**: `T023` and `T024` can run in parallel before `T025`.

## Parallel Example: User Story 1

```bash
# After foundational tasks complete:
Task: "T009 [US1] Add create/update idempotency tests in src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.test.ts"
Task: "T012 [US1] Finalize action registration/export wiring in src/plugins/scaffolder-backend-module-datadog/src/actions/index.ts and src/plugins/scaffolder-backend-module-datadog/src/module.ts"
```

## Parallel Example: User Story 2

```bash
# After baseline composition behavior (T014) is implemented:
Task: "T015 [US2] Update action contract examples in specs/004-datadog-dashboard-scaffolding/contracts/scaffolder-action.md"
Task: "T016 [US2] Update module README usage in src/plugins/scaffolder-backend-module-datadog/README.md"
```

## Parallel Example: User Story 3

```bash
# After validation implementation tasks are in progress:
Task: "T018 [US3] Add unmanaged-dashboard ownership collision coverage in src/plugins/scaffolder-backend-module-datadog/src/actions/dashboard/create.test.ts"
Task: "T022 [US3] Document validation/ownership troubleshooting in src/plugins/scaffolder-backend-module-datadog/README.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational).
3. Complete Phase 3 (US1).
4. Validate US1 independently using the stated independent test.
5. Demo/deploy MVP behavior.

### Incremental Delivery

1. Deliver US1 for baseline dashboard provisioning.
2. Add US2 to scale via reusable baseline selection and multi-dashboard runs.
3. Add US3 to harden validation and failure clarity.
4. Complete Phase 6 polish and validation.

### Parallel Team Strategy

1. Pair on Setup + Foundational to converge on action architecture.
2. After Foundational:
   - Engineer A: US1 core provisioning behavior.
   - Engineer B: US2 docs + contract alignment once composition stabilizes.
   - Engineer C: US3 validation/error hardening and troubleshooting docs.

---

## Notes

- `[P]` tasks are limited to different files with no dependency on incomplete tasks.
- Story labels map every story-phase task to the corresponding user story.
- Each story includes an independent test criterion for standalone verification.
- Suggested MVP scope: **Phase 1 + Phase 2 + Phase 3 (US1)**.

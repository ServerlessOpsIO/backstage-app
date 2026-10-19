---

description: "Task list for implementing Datadog alarm scaffolder action"
---

# Tasks: Scaffolder Datadog Alarm Action Plugin

**Input**: Design documents from `/specs/003-datadog-alarm-scaffolding/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/scaffolder-action.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- `[P]`: Task can run in parallel (different files, no dependency on incomplete tasks)
- `[Story]`: User story label (`[US1]`, `[US2]`, `[US3]`)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new scaffolder backend module package and source layout.

- [ ] T001 Create Datadog module package manifest in `src/plugins/scaffolder-backend-module-datadog/package.json`
- [ ] T002 Create module entrypoint and action barrel exports in `src/plugins/scaffolder-backend-module-datadog/src/index.ts` and `src/plugins/scaffolder-backend-module-datadog/src/actions/index.ts`
- [ ] T003 Create initial Datadog alarm action source and test files in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts` and `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire backend/runtime integration required before user-story behavior.

**⚠️ CRITICAL**: Complete this phase before implementing user stories.

- [ ] T004 Add workspace dependency for the new module in `src/packages/backend/package.json`
- [ ] T005 Register Datadog scaffolder backend module import in `src/packages/backend/src/index.ts`
- [ ] T006 Implement scaffolder action registration in `src/plugins/scaffolder-backend-module-datadog/src/module.ts`
- [ ] T007 [P] Add Datadog runtime configuration keys in `src/app-config.yaml`, `src/app-config.production.yaml`, and `src/app-config.home.yaml`
- [ ] T008 Implement Datadog account config loading (`apiKey`, `appKey`, `site`) with explicit missing-config failures in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts`
- [ ] T009 Implement Datadog API client initialization and monitor create request helper in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts`

**Checkpoint**: Backend wiring and runtime configuration are ready for story implementation.

---

## Phase 3: User Story 1 - Scaffold projects with default Datadog alarms (Priority: P1) 🎯 MVP

**Goal**: Scaffold runs create baseline Datadog metric monitors and return traceable outcomes.

**Independent Test**: Run a scaffold step with a valid baseline and verify output contains created monitor results with Datadog references.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add success-path unit test for single-monitor creation output in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.test.ts`

### Implementation for User Story 1

- [ ] T011 [US1] Implement action id `x_datadog:alarm:create` and handler wiring in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts`
- [ ] T012 [US1] Map successful Datadog responses to `AlarmProvisioningResult` fields (`index`, `name`, `status`, `monitorId`, `monitorUrl`) in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts`
- [ ] T013 [US1] Emit per-monitor scaffold outputs for traceability in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts`

**Checkpoint**: P1 baseline monitor provisioning works independently.

---

## Phase 4: User Story 2 - Template authors can define alarm configuration (Priority: P2)

**Goal**: Support complete template-defined metric monitor definitions, including multi-monitor payloads in one run.

**Independent Test**: Run the action with multiple monitor definitions and verify each monitor is processed once in the same scaffold step with template-supplied settings.

### Tests for User Story 2

- [ ] T014 [P] [US2] Add multi-monitor processing unit test for single-step execution in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.test.ts`

### Implementation for User Story 2

- [ ] T015 [US2] Enforce top-level request constraint `monitors` with `minItems = 1` in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts`
- [ ] T016 [US2] Enforce monitor field constraints `name: Non-empty`, `type: Must represent Datadog metric monitor type`, `query: Non-empty Datadog metric query`, and `message: Non-empty; includes notification destinations` in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts`
- [ ] T017 [US2] Pass optional template fields `tags`, `options`, and `priority` through to Datadog monitor create payloads in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts`

**Checkpoint**: P2 template-defined multi-monitor configuration works independently.

---

## Phase 5: User Story 3 - Invalid alarm definitions fail clearly (Priority: P3)

**Goal**: Reject invalid definitions with monitor-specific, actionable failure details.

**Independent Test**: Run with one invalid monitor in a multi-monitor input and verify failure output identifies the specific monitor and reason.

### Tests for User Story 3

- [ ] T018 [P] [US3] Add validation failure unit test for missing required fields with index/name-specific errors in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.test.ts`
- [ ] T019 [US3] Add partial-failure unit test for one invalid monitor in a multi-monitor request in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.test.ts`

### Implementation for User Story 3

- [ ] T020 [US3] Implement failure result mapping with `status: "failed"` and actionable `error` per monitor in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts`
- [ ] T021 [US3] Fail scaffolder action execution when any required monitor fails while preserving collected per-monitor outcomes in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts`
- [ ] T022 [US3] Preserve non-idempotent retry behavior by always calling Datadog create monitor and never deduplicating by project identity/name in `src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts`

**Checkpoint**: P3 invalid-definition feedback is clear and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize quality, docs alignment, and validation workflow.

- [ ] T023 [P] Add module registration unit test coverage in `src/plugins/scaffolder-backend-module-datadog/src/module.test.ts`
- [ ] T024 Align action contract documentation with implemented input/output semantics in `specs/003-datadog-alarm-scaffolding/contracts/scaffolder-action.md`
- [ ] T025 Validate and update implementation verification steps in `specs/003-datadog-alarm-scaffolding/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2 (can start after foundation; usually sequenced after US1 due shared action file).
- **Phase 5 (US3)**: Depends on Phase 2 (can start after foundation; usually sequenced after US2 due shared action file).
- **Phase 6 (Polish)**: Depends on completion of selected user stories.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories.
- **US2 (P2)**: No hard dependency on US1, but reuses the same action implementation surface.
- **US3 (P3)**: No hard dependency on US1/US2, but validates shared behavior in the same action.

### Within Each User Story

- Add tests first, confirm they fail, then implement behavior.
- Implement validation before external API invocation where applicable.
- Complete story checkpoint before moving to lower-priority story work.

---

## Parallel Opportunities

- **Setup/Foundation**: T007 can run in parallel with T008-T009 after T004-T006 are in progress.
- **US1**: T010 can run in parallel with early coding spikes for T011 in separate files.
- **US2**: T014 can run in parallel with T015 planning/design updates.
- **US3**: T018 can run in parallel with drafting T020 error-shaping logic.
- **Polish**: T023 can run in parallel with T024-T025.

---

## Parallel Example: User Story 1

```bash
Task: "T010 [US1] Add success-path unit test in src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.test.ts"
Task: "T011 [US1] Implement action handler in src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T014 [US2] Add multi-monitor processing unit test in src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.test.ts"
Task: "T015 [US2] Enforce monitors minItems constraint in src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts"
```

## Parallel Example: User Story 3

```bash
Task: "T018 [US3] Add validation failure unit test in src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.test.ts"
Task: "T020 [US3] Implement per-monitor failed result mapping in src/plugins/scaffolder-backend-module-datadog/src/actions/alarm/create.ts"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational).
3. Complete Phase 3 (US1) and validate independently.
4. Demo/deploy MVP behavior before expanding scope.

### Incremental Delivery

1. Ship US1 (baseline monitor creation + traceable output).
2. Add US2 (complete multi-monitor template definition support).
3. Add US3 (clear validation/failure semantics).
4. Finish with Phase 6 polish and broad validation commands.

### Parallel Team Strategy

1. One engineer completes package/backend wiring (T001-T009).
2. One engineer drives success-path behavior (US1).
3. One engineer prepares multi-monitor + validation tests (US2/US3) to be merged after core handler shape stabilizes.

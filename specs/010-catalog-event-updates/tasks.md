# Tasks: Event-Driven Catalog Updates

**Input**: Design documents from `/specs/010-catalog-event-updates/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included because this feature changes provider behavior and constitution requires targeted automated validation for changed behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`)
- Every task includes an explicit file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add event-system dependencies and event contract scaffolding.

- [ ] T001 Add Backstage events runtime dependencies (`@backstage/plugin-events-backend`, `@backstage/plugin-events-node`, `@backstage/plugin-events-backend-module-aws-sqs`) in `src/packages/backend/package.json`
- [ ] T002 Update lockfile entries for new backend dependencies in `src/yarn.lock`
- [ ] T003 Add `@backstage/plugin-events-node` dependency for provider-side topic handling in `src/plugins/catalog-backend-module-serverlessops-catalog/package.json`
- [ ] T004 [P] Create event payload and outcome types in `src/plugins/catalog-backend-module-serverlessops-catalog/src/events/types.ts`
- [ ] T005 [P] Create schema validation helper for incoming notifications in `src/plugins/catalog-backend-module-serverlessops-catalog/src/events/notification-schema.ts`
- [ ] T006 [P] Add event fixture payloads for create/update/delete/invalid messages in `src/plugins/catalog-backend-module-serverlessops-catalog/src/provider/__fixtures__/catalog-events.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire event ingestion, provider configuration, and shared processing scaffolding.

**⚠️ CRITICAL**: No user story work starts until this phase is complete.

- [ ] T007 Register events backend plugins in `src/packages/backend/src/index.ts`
- [ ] T008 Add SQS topic configuration for `serverlessops.catalog` under `events.modules.awsSqs.awsSqsConsumingEventPublisher.topics` in `src/app-config.yaml`
- [ ] T009 Add production SQS topic configuration and queue environment placeholders in `src/app-config.production.yaml`
- [ ] T010 Extend provider configuration types for event-driven settings in `src/plugins/catalog-backend-module-serverlessops-catalog/src/provider/ServerlessOpsCatalogProvider.ts`
- [ ] T011 Wire event subscription and provider dispatch bootstrap in `src/plugins/catalog-backend-module-serverlessops-catalog/src/module.ts`
- [ ] T012 [P] Implement shared processing outcome logger (`applied`, `rejected`, `failed`, `dlq-routed`) in `src/plugins/catalog-backend-module-serverlessops-catalog/src/events/outcome-logger.ts`
- [ ] T013 [P] Add event-processor orchestration shell for validate/dispatch/result recording in `src/plugins/catalog-backend-module-serverlessops-catalog/src/events/event-processor.ts`
- [ ] T014 Update baseline provider test setup for event-driven initialization paths in `src/plugins/catalog-backend-module-serverlessops-catalog/src/provider/ServerlessOpsCatalogProvider.test.ts`

**Checkpoint**: Event ingestion infrastructure and provider wiring are ready for story implementation.

---

## Phase 3: User Story 1 - New entities appear without polling delay (Priority: P1) 🎯 MVP

**Goal**: Apply `create` notifications to add entities quickly without waiting for scheduled polling.

**Independent Test**: Publish a valid `create` notification and verify the entity appears in Backstage within the freshness target without waiting for fallback polling.

### Tests for User Story 1

- [ ] T015 [P] [US1] Add failing unit test for `create` notification -> `applyMutation` add behavior in `src/plugins/catalog-backend-module-serverlessops-catalog/src/provider/ServerlessOpsCatalogProvider.test.ts`
- [ ] T016 [P] [US1] Add failing unit test that validates `create` event routing from topic handler into provider logic in `src/plugins/catalog-backend-module-serverlessops-catalog/src/events/event-processor.test.ts`

### Implementation for User Story 1

- [ ] T017 [US1] Implement provider `create` notification mutation path with managed-by annotations in `src/plugins/catalog-backend-module-serverlessops-catalog/src/provider/ServerlessOpsCatalogProvider.ts`
- [ ] T018 [US1] Implement payload validation rules in `src/plugins/catalog-backend-module-serverlessops-catalog/src/events/notification-schema.ts` quoting constraints verbatim: `changeType must be one of the three supported values`, `entityRef must be non-empty and match provider entity identity constraints`, `entity must include apiVersion, kind, and metadata.name`, and `unknown changeType or missing required fields is a processing failure and must be retried/then DLQ-routed`
- [ ] T019 [US1] Add schema-level checks from contract (`eventId minLength: 1`, `entityRef pattern: ^[^/]+/[^/]+/[^/]+$`, required `eventId/changeType/entityRef/entity`) in `src/plugins/catalog-backend-module-serverlessops-catalog/src/events/notification-schema.ts`
- [ ] T020 [US1] Wire `serverlessops.catalog` `create` message dispatch to provider handler in `src/plugins/catalog-backend-module-serverlessops-catalog/src/module.ts`
- [ ] T021 [US1] Record successful create processing outcomes with event and delivery metadata in `src/plugins/catalog-backend-module-serverlessops-catalog/src/events/outcome-logger.ts`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Entity updates and removals stay in sync (Priority: P1)

**Goal**: Apply `update` and `delete` notifications accurately, including duplicates and missing-entity update handling.

**Independent Test**: Publish update and delete notifications (including duplicates) and verify catalog state remains correct with no duplicate entities.

### Tests for User Story 2

- [ ] T022 [P] [US2] Add failing unit tests for update mutation and missing-entity fetch/add behavior in `src/plugins/catalog-backend-module-serverlessops-catalog/src/provider/ServerlessOpsCatalogProvider.test.ts`
- [ ] T023 [P] [US2] Add failing unit tests for delete mutation semantics and duplicate event idempotency in `src/plugins/catalog-backend-module-serverlessops-catalog/src/provider/ServerlessOpsCatalogProvider.test.ts`

### Implementation for User Story 2

- [ ] T024 [US2] Implement provider `update` path with fallback fetch-by-entityRef then add-if-present behavior in `src/plugins/catalog-backend-module-serverlessops-catalog/src/provider/ServerlessOpsCatalogProvider.ts`
- [ ] T025 [US2] Implement provider `delete` path using provider-managed entity removal semantics in `src/plugins/catalog-backend-module-serverlessops-catalog/src/provider/ServerlessOpsCatalogProvider.ts`
- [ ] T026 [US2] Add idempotency guard keyed by `eventId` + `entityRef` in `src/plugins/catalog-backend-module-serverlessops-catalog/src/events/processed-event-cache.ts`
- [ ] T027 [US2] Route `create|update|delete` and reject unsupported `changeType` in `src/plugins/catalog-backend-module-serverlessops-catalog/src/events/event-processor.ts`
- [ ] T028 [US2] Emit deterministic duplicate/unsupported-type outcomes with reasons in `src/plugins/catalog-backend-module-serverlessops-catalog/src/events/outcome-logger.ts`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Polling load is reduced while preserving reliability (Priority: P2)

**Goal**: Keep event-driven freshness while reducing polling and ensuring bounded retries + DLQ outcomes.

**Independent Test**: Reduce polling interval, process normal traffic, force a failure path, and verify retries/DLQ/outcome auditing with catalog convergence through fallback polling.

### Tests for User Story 3

- [ ] T029 [P] [US3] Add failing tests for retry-attempt accounting and terminal `dlq-routed` outcome capture in `src/plugins/catalog-backend-module-serverlessops-catalog/src/events/event-processor.test.ts`
- [ ] T030 [P] [US3] Add failing test that one failed message does not block processing of subsequent messages in `src/plugins/catalog-backend-module-serverlessops-catalog/src/events/event-processor.test.ts`

### Implementation for User Story 3

- [ ] T031 [US3] Implement bounded-retry outcome mapping using `approximateReceiveCount` delivery metadata in `src/plugins/catalog-backend-module-serverlessops-catalog/src/events/event-processor.ts`
- [ ] T032 [US3] Configure SQS consumer options and DLQ-compatible settings for `serverlessops.catalog` in `src/app-config.production.yaml`
- [ ] T033 [US3] Reduce fallback polling frequency by at least 80% from the baseline schedule for `catalog.providers.serverlessops-catalog.schedule` in `src/app-config.production.yaml`
- [ ] T034 [US3] Document least-privilege publish/consume queue access requirements in `specs/010-catalog-event-updates/contracts/event-topic-contract.md`
- [ ] T035 [US3] Add quickstart validation steps for disruption recovery and fallback polling convergence in `specs/010-catalog-event-updates/quickstart.md`

**Checkpoint**: All user stories are independently functional and operationally verifiable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize documentation, exports, and validation guidance across stories.

- [ ] T036 [P] Update module documentation with event-driven architecture and config examples in `src/plugins/catalog-backend-module-serverlessops-catalog/README.md`
- [ ] T037 [P] Export new event-processing types/helpers from `src/plugins/catalog-backend-module-serverlessops-catalog/src/index.ts`
- [ ] T038 Align local development config notes for event-driven mode and fallback polling in `src/app-config.yaml`
- [ ] T039 Capture implementation validation command list and expected outcomes in `specs/010-catalog-event-updates/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all story work.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2; can run in parallel with US1 after foundational completion, but listed after US1 for priority ordering.
- **Phase 5 (US3)**: Depends on Phase 2 and on US1/US2 event paths being implemented.
- **Phase 6 (Polish)**: Depends on completion of target stories.

### User Story Dependencies

- **US1 (P1)**: Starts immediately after foundational completion.
- **US2 (P1)**: Starts immediately after foundational completion; does not require US1 completion.
- **US3 (P2)**: Requires event processing behavior from US1+US2, then applies reliability and operational tuning.

### Within Each User Story

- Write tests first and confirm they fail before implementation.
- Implement handlers and mutation behavior next.
- Add outcome logging/validation refinements after core behavior works.
- Validate each story independently before progressing.

---

## Parallel Execution Examples

### User Story 1

```bash
# Parallel test authoring
Task: "T015 [US1] Add failing unit test for create notification mutation in ServerlessOpsCatalogProvider.test.ts"
Task: "T016 [US1] Add failing unit test for create routing in event-processor.test.ts"
```

### User Story 2

```bash
# Parallel test authoring
Task: "T022 [US2] Add failing unit tests for update and missing-entity fetch/add in ServerlessOpsCatalogProvider.test.ts"
Task: "T023 [US2] Add failing unit tests for delete semantics and duplicate idempotency in ServerlessOpsCatalogProvider.test.ts"
```

### User Story 3

```bash
# Parallel reliability test authoring
Task: "T029 [US3] Add failing tests for retry accounting and dlq-routed outcomes in event-processor.test.ts"
Task: "T030 [US3] Add failing test for non-blocking continuation after failure in event-processor.test.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate create-event freshness behavior end to end.
4. Demo/deploy MVP increment.

### Incremental Delivery

1. Deliver US1 for create-event freshness.
2. Deliver US2 for update/delete correctness and idempotency.
3. Deliver US3 for retry/DLQ reliability and polling reduction.
4. Finish with Phase 6 polish/documentation.

### Parallel Team Strategy

1. Team completes Setup + Foundational together.
2. Then split:
   - Engineer A: US1
   - Engineer B: US2
   - Engineer C: US3 test scaffolding + ops docs, then integrate after US1/US2 handlers land.

---

## Notes

- `[P]` tasks are intentionally scoped to separate files to avoid merge conflicts.
- Story labels map every implementation task to a specific user story for traceability.
- Event publishing remains external and out of scope; this task list covers Backstage consumption and provider behavior only.

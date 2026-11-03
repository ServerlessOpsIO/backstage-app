---

description: "Implementation tasks for the My Services Homepage Widget"
---

# Tasks: My Services Homepage Widget

**Input**: Design documents from `/specs/006-my-services-widget/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contract](./contracts/my-services-widget-contract.md)

**Tests**: Include the colocated Jest tests required by the implementation plan and repository constitution. Write each story's tests before its implementation.

**Organization**: Tasks are grouped by user story to enable incremental implementation. User Stories 2 and 3 extend the widget introduced by User Story 1.

## Phase 1: Setup

**Purpose**: Add the catalog React API dependency to the existing home module.

- [X] T001 Add `@backstage/plugin-catalog-react` to `src/plugins/home-module-info-hub/package.json` and update `src/yarn.lock` using the repository package manager

---

## Phase 2: Foundational

**Purpose**: No additional shared infrastructure is required. The existing home module, widget state panel, Backstage API test providers, and Jest configuration are reused.

**Checkpoint**: Complete T001 before implementing the user stories.

---

## Phase 3: User Story 1 - See services I own on the homepage (Priority: P1) 🎯 MVP

**Goal**: Show the signed-in user's directly and group-owned services, excluding unrelated services, with a service link and clear loading, empty, and unavailable states.

**Independent Test**: Using stubbed identity and catalog APIs, verify direct and group ownership, exclusion of unrelated services and non-service components, duplicate suppression, display-name sorting, service links, and loading, empty, and unavailable states.

### Tests for User Story 1

- [X] T002 [US1] Add colocated tests for ownership filtering, duplicate suppression, display-name sorting, title fallback, service links, empty ownership refs, loading, empty, and unavailable states in `src/plugins/home-module-info-hub/src/components/my-services-widget.test.tsx`

### Implementation for User Story 1

- [X] T003 [P] [US1] Define the `MyService` model, catalog-entity mapping, owner fallback, missing-name handling, display-name sorting, and optional lifecycle data in `src/plugins/home-module-info-hub/src/models/my-services.ts`
- [X] T004 [US1] Implement the widget's identity lookup, guarded catalog query, service rows, service links, and loading, empty, and unavailable states in `src/plugins/home-module-info-hub/src/components/my-services-widget.tsx`
- [X] T005 [US1] Register the `HomePageMyServices` widget using a `HomePageWidgetBlueprint` named `my-services` in `src/plugins/home-module-info-hub/src/module.tsx`
- [X] T006 [P] [US1] Add `HomePageMyServices` to `src/app-config.yaml` at column 0, row 12, width 9, height 8; shift the GitHub widgets to rows 20, 26, 32, and 38; set the calendar height to 28; and update `src/app-config.test.ts` to assert the new layout and widget presence

**Checkpoint**: User Story 1 is independently usable with direct/group ownership, safe empty refs, links, and explicit data states.

---

## Phase 4: User Story 2 - Understand why and how I own each service (Priority: P2)

**Goal**: Show each service's owning entity and lifecycle without failing when lifecycle is absent.

**Independent Test**: Stub a user who belongs to multiple groups and verify rows show their correct linked owner and lifecycle; a response with no lifecycle still shows the service and leaves lifecycle blank.

### Tests for User Story 2

- [X] T007 [US2] Extend `src/plugins/home-module-info-hub/src/components/my-services-widget.test.tsx` with owner-link, lifecycle, and mocked missing-lifecycle response cases

### Implementation for User Story 2

- [X] T008 [US2] Render linked owner and optional lifecycle columns in `src/plugins/home-module-info-hub/src/components/my-services-widget.tsx`

**Checkpoint**: User Story 2 adds ownership context while preserving the User Story 1 listing and states.

---

## Phase 5: User Story 3 - Navigate a long list of owned services (Priority: P3)

**Goal**: Let users page through all owned services and open the catalog's owned-service view.

**Independent Test**: With 13 alphabetically ordered owned services, verify pages contain 10 and 3 rows respectively and the "View all" link targets the catalog's component/service/owned filters.

### Tests for User Story 3

- [X] T009 [US3] Extend `src/plugins/home-module-info-hub/src/components/my-services-widget.test.tsx` with 13-service paging and "View all" destination cases

### Implementation for User Story 3

- [X] T010 [US3] Add local paging at 10 services per page, show the pager only above 10 results, and add the contract's filtered "View all" link in `src/plugins/home-module-info-hub/src/components/my-services-widget.tsx`

**Checkpoint**: User Story 3 exposes every service and a full catalog route without additional catalog requests.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Keep operator-facing documentation and repository validation aligned with the feature.

- [ ] T011 [P] Document the My Services widget and saved-layout caveat in `src/plugins/home-module-info-hub/README.md`
- [ ] T012 [P] Update `specs/006-my-services-widget/quickstart.md` so every temporary Component has a valid lifecycle and the missing-lifecycle scenario is covered by the mocked widget test rather than invalid catalog data
- [ ] T013 Run `yarn workspace @internal/backstage-plugin-home-module-info-hub test --watchAll=false` from `src/` and resolve failures
- [ ] T014 Run `yarn tsc:full`, `yarn build:all`, `yarn test:all`, and `yarn lint:all` from `src/` and resolve failures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 adds the catalog API dependency.
- **Foundational (Phase 2)**: Reuses existing infrastructure; T001 is its only prerequisite.
- **User Stories (Phases 3–5)**: User Story 1 depends on the setup dependency. User Stories 2 and 3 extend the widget from User Story 1 and therefore follow it; their tests precede their implementation.
- **Polish (Phase 6)**: Documentation follows the design implementation. Validation runs after all implementation and documentation updates.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after T001; no user-story dependencies.
- **User Story 2 (P2)**: Depends on the User Story 1 widget and model.
- **User Story 3 (P3)**: Depends on the User Story 1 widget and ordered service list.

### Parallel Opportunities

- After T002 is written, T003 and T006 can proceed in parallel because they change separate model and layout files; T004 follows T002 and T003.
- After User Story 1, the owner/lifecycle test work (T007) and paging/view-all test work (T009) can be prepared independently, but changes to the shared widget test and component files should be integrated sequentially.
- T011 and T012 are independent documentation updates.
- Run validation after all implementation tasks are complete.

## Parallel Example: User Story 1

```text
Task: T002 Add the colocated widget behavior tests in src/plugins/home-module-info-hub/src/components/my-services-widget.test.tsx
After T002 is written:
Task: T003 Define the service model and catalog mapping in src/plugins/home-module-info-hub/src/models/my-services.ts
Task: T006 Update the homepage layout and its assertions in src/app-config.yaml and src/app-config.test.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001.
2. Complete User Story 1, including its tests, model, widget registration, and layout.
3. Validate User Story 1 independently with the focused module test and type-check.
4. Stop for review/demo if the direct/group ownership widget is sufficient as an MVP.

### Incremental Delivery

1. Deliver User Story 1 as the MVP.
2. Add User Story 2 owner and lifecycle context, then verify it independently.
3. Add User Story 3 paging and catalog navigation, then verify it independently.
4. Complete documentation and repository-wide application validation.

## Notes

- `[P]` indicates tasks touching separate files that can be performed independently without unfinished-task dependencies.
- `[US1]`, `[US2]`, and `[US3]` map to the user stories in `specs/006-my-services-widget/spec.md`.
- Tests are colocated with the widget component in the existing module.
- No backend plugin, external service, credential, or infrastructure change is planned.

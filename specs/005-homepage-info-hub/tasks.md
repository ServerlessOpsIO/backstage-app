---

description: "Task list for implementing homepage useful information hub"
---

# Tasks: Homepage Useful Information Hub

**Input**: Design documents from `/specs/005-homepage-info-hub/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/homepage-info-hub-ui-contracts.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`)
- All tasks include explicit file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new home module package and baseline wiring points.

- [ ] T001 Create plugin package skeleton for `@internal/backstage-plugin-home-module-info-hub` in src/plugins/home-module-info-hub/package.json, src/plugins/home-module-info-hub/README.md, src/plugins/home-module-info-hub/.eslintrc.js, src/plugins/home-module-info-hub/src/index.ts, and src/plugins/home-module-info-hub/src/module.tsx
- [ ] T002 [P] Create feature folder structure and placeholder files in src/plugins/home-module-info-hub/src/api/github-work-client.ts, src/plugins/home-module-info-hub/src/api/google-calendar-client.ts, src/plugins/home-module-info-hub/src/components/github-work-widget.tsx, src/plugins/home-module-info-hub/src/components/google-calendar-widget.tsx, src/plugins/home-module-info-hub/src/components/widget-state-panel.tsx, and src/plugins/home-module-info-hub/src/__tests__/.gitkeep
- [ ] T003 Add initial app integration import and feature registration placeholder in src/packages/app/src/App.tsx for @internal/backstage-plugin-home-module-info-hub

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contracts, widget state handling, and module registration needed by all stories.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [ ] T004 Implement shared type contracts and runtime guards in src/plugins/home-module-info-hub/src/models/homepage-info-hub.ts with these rules quoted in code-level validation: "`id` must be unique within one layout variant.", "URL must be `https://`.", "All required widgets from FR-001..FR-013 must be present in every published layout variant."
- [ ] T005 [P] Implement shared widget state model helpers in src/plugins/home-module-info-hub/src/models/widget-data-state.ts enforcing: "`ready` requires data payload present." and "`empty` and `unavailable` must provide explicit message text."
- [ ] T006 [P] Implement reusable UI state renderer for loading/empty/unavailable messaging in src/plugins/home-module-info-hub/src/components/widget-state-panel.tsx
- [ ] T007 Register stable widget IDs from contracts in src/plugins/home-module-info-hub/src/module.tsx (`HomePageGitHubOpenedIssues`, `HomePageGitHubAssignedIssues`, `HomePageGitHubOpenedPrs`, `HomePageGitHubReviewRequestedPrs`, `HomePageGoogleCalendarToday`)
- [ ] T008 Export module entrypoints in src/plugins/home-module-info-hub/src/index.ts and ensure package export map in src/plugins/home-module-info-hub/package.json is valid for workspace builds
- [ ] T009 Wire finalized module registration into src/packages/app/src/App.tsx and keep composition-only behavior in src/packages/app/src/modules/home/homeModule.tsx

**Checkpoint**: Foundation ready for independent user story implementation.

---

## Phase 3: User Story 1 - Find tools and time quickly (Priority: P1) 🎯 MVP

**Goal**: Keep search at top and provide required toolkit links plus local+UTC clock visibility.

**Independent Test**: Open `/` and verify top search bar, required toolkit links (AWS/GitHub/Datadog/Google Workspace), and world clock showing local timezone + UTC.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add homepage layout/config assertions in src/plugins/home-module-info-hub/src/__tests__/homepage-layout-config.test.ts for search-bar-first positioning and required widget presence

### Implementation for User Story 1

- [ ] T011 [P] [US1] Update toolkit links to required destinations in src/app-config.yaml under `home-page-widget:home/toolkit`
- [ ] T012 [US1] Preserve `HomePageSearchBar` as first row entry and maintain required home layout slots in src/app-config.yaml `page:home.defaultConfig`
- [ ] T013 [P] [US1] Implement local-and-UTC clock widget component in src/plugins/home-module-info-hub/src/components/local-utc-clock-widget.tsx showing browser-local timezone label and UTC simultaneously
- [ ] T014 [US1] Register local+UTC clock widget in src/plugins/home-module-info-hub/src/module.tsx and update src/app-config.yaml world clock component mapping to use the new widget
- [ ] T015 [US1] Add unavailable fallback behavior for unresolved timezone detection in src/plugins/home-module-info-hub/src/components/local-utc-clock-widget.tsx without impacting other widgets

**Checkpoint**: User Story 1 is functional and independently testable.

---

## Phase 4: User Story 2 - Track personal GitHub work (Priority: P2)

**Goal**: Show opened issues, assigned issues, opened PRs, and review-requested PRs as separate widgets using each user’s linked GitHub account.

**Independent Test**: With a linked GitHub account, verify all four widgets render with correct loading/ready/empty/unavailable behavior and correct user-scoped items.

### Tests for User Story 2

- [ ] T016 [P] [US2] Add category query and normalization tests in src/plugins/home-module-info-hub/src/__tests__/github-work-client.test.ts for all four categories
- [ ] T017 [P] [US2] Add rendering-state tests in src/plugins/home-module-info-hub/src/__tests__/github-work-widget.test.tsx validating loading, ready, empty, and unavailable states

### Implementation for User Story 2

- [ ] T018 [US2] Implement GitHub data client in src/plugins/home-module-info-hub/src/api/github-work-client.ts using `@octokit/rest` and enforce constraints verbatim: "Exactly one category per widget.", "`maxItems` must be positive and bounded for rendering consistency.", and "`url` must be valid HTTPS GitHub URL."
- [ ] T019 [US2] Implement GitHub auth token acquisition via Backstage auth APIs in src/plugins/home-module-info-hub/src/api/github-work-client.ts so queries run with the signed-in user’s linked account
- [ ] T020 [US2] Implement reusable list widget in src/plugins/home-module-info-hub/src/components/github-work-widget.tsx honoring shared state rules: "`ready` requires data payload present." and "`empty` and `unavailable` must provide explicit message text."
- [ ] T021 [US2] Register four GitHub widget blueprints with stable IDs and titles in src/plugins/home-module-info-hub/src/module.tsx
- [ ] T022 [US2] Add all four GitHub widgets to homepage default layout in src/app-config.yaml `page:home.defaultConfig` while preserving existing required baseline widgets
- [ ] T023 [US2] Document GitHub widget empty/unavailable UX copy in specs/005-homepage-info-hub/contracts/homepage-info-hub-ui-contracts.md to keep behavior contract-backed

**Checkpoint**: User Stories 1 and 2 are both independently functional.

---

## Phase 5: User Story 3 - See schedule and evaluate layout options (Priority: P3)

**Goal**: Show today’s events from the user’s primary Google Calendar and provide at least two complete layout variants for stakeholder selection.

**Independent Test**: Confirm calendar widget shows only today’s primary-calendar events for authorized users and verify two screenshot/mockup variants exist with full required widget set.

### Tests for User Story 3

- [ ] T024 [P] [US3] Add query-window and state tests in src/plugins/home-module-info-hub/src/__tests__/google-calendar-client.test.ts for local-day boundaries and unavailable handling
- [ ] T025 [P] [US3] Add render-state tests in src/plugins/home-module-info-hub/src/__tests__/google-calendar-widget.test.tsx for ready/empty/unavailable outputs

### Implementation for User Story 3

- [ ] T026 [US3] Implement Google Calendar today client in src/plugins/home-module-info-hub/src/api/google-calendar-client.ts using primary calendar and enforce constraints verbatim: "`timeMin < timeMax`." and "Query window must represent current local day for the signed-in user."
- [ ] T027 [US3] Implement today-events widget UI in src/plugins/home-module-info-hub/src/components/google-calendar-widget.tsx with explicit no-events and unavailable states
- [ ] T028 [US3] Register `HomePageGoogleCalendarToday` widget in src/plugins/home-module-info-hub/src/module.tsx and add it to src/app-config.yaml `page:home.defaultConfig`
- [ ] T029 [US3] Create two complete layout definitions in specs/005-homepage-info-hub/layout/variant-a.md and specs/005-homepage-info-hub/layout/variant-b.md ensuring each variant includes all required widgets and required toolkit links
- [ ] T030 [US3] Capture stakeholder review artifacts at specs/005-homepage-info-hub/artifacts/variant-a.png and specs/005-homepage-info-hub/artifacts/variant-b.png and link them from specs/005-homepage-info-hub/quickstart.md

**Checkpoint**: All user stories are independently functional and review-ready.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, validation, and delivery readiness across stories.

- [ ] T031 [P] Align environment-driven config notes for auth/provider prerequisites in src/app-config.home.yaml and src/app-config.production.yaml for GitHub + Google user flows
- [ ] T032 [P] Update implementation notes and manual verification steps in specs/005-homepage-info-hub/quickstart.md for final widget IDs, no-data states, and variant review workflow
- [ ] T033 Execute `yarn tsc:full`, `yarn lint:all`, and `yarn test:all` from src/ and record outcomes in specs/005-homepage-info-hub/artifacts/validation-report.md
- [ ] T034 Perform final contract consistency pass across specs/005-homepage-info-hub/spec.md, specs/005-homepage-info-hub/plan.md, and specs/005-homepage-info-hub/contracts/homepage-info-hub-ui-contracts.md and document deltas in specs/005-homepage-info-hub/artifacts/consistency-notes.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all user stories
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 2 (can start after Phase 2; recommended after US1 MVP validation)
- **Phase 5 (US3)**: Depends on Phase 2 (can start after Phase 2; recommended after US2 data widgets)
- **Phase 6 (Polish)**: Depends on completion of selected story scope

### User Story Dependencies

- **US1 (P1)**: Independent after Foundational; defines MVP baseline
- **US2 (P2)**: Independent after Foundational; integrates into same homepage layout surface
- **US3 (P3)**: Independent after Foundational; requires calendar integration and variant artifacts

---

## Parallel Opportunities

- **Setup**: T002 can run in parallel with T003 after T001 starts package scaffolding
- **Foundational**: T005 and T006 can run in parallel after T004
- **US1**: T010, T011, and T013 can run in parallel; then converge at T014/T015
- **US2**: T016 and T017 run in parallel; T018/T019 precede T020; T021/T022/T023 follow
- **US3**: T024 and T025 run in parallel; T026 precedes T027/T028; T029 and T030 run after widget registration
- **Polish**: T031 and T032 can run in parallel; T033/T034 finalize

---

## Parallel Example: User Story 1

```bash
# Parallelizable US1 work
Task: "T010 [US1] Add homepage layout/config assertions in src/plugins/home-module-info-hub/src/__tests__/homepage-layout-config.test.ts"
Task: "T011 [US1] Update toolkit links in src/app-config.yaml"
Task: "T013 [US1] Implement local-and-UTC clock widget in src/plugins/home-module-info-hub/src/components/local-utc-clock-widget.tsx"
```

## Parallel Example: User Story 2

```bash
# Parallelizable US2 tests
Task: "T016 [US2] Add github-work-client tests in src/plugins/home-module-info-hub/src/__tests__/github-work-client.test.ts"
Task: "T017 [US2] Add github-work-widget tests in src/plugins/home-module-info-hub/src/__tests__/github-work-widget.test.tsx"
```

## Parallel Example: User Story 3

```bash
# Parallelizable US3 tests
Task: "T024 [US3] Add google-calendar-client tests in src/plugins/home-module-info-hub/src/__tests__/google-calendar-client.test.ts"
Task: "T025 [US3] Add google-calendar-widget tests in src/plugins/home-module-info-hub/src/__tests__/google-calendar-widget.test.tsx"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1).
3. Validate US1 independently on `/`.
4. Share MVP baseline before personalized widgets.

### Incremental Delivery

1. Add US2 GitHub widgets and validate independently.
2. Add US3 calendar + layout variants and validate independently.
3. Finish with Phase 6 polish and full validation commands.

### Parallel Team Strategy

1. Team aligns on Phase 1 and Phase 2 together.
2. Split by story after foundation:
   - Engineer A: US1
   - Engineer B: US2
   - Engineer C: US3
3. Rejoin for Phase 6 validation and artifact consolidation.


---

description: "Task list for Spec Form Page and Spec Issue Filing"
---

# Tasks: Spec Form Page and Spec Issue Filing

**Input**: Design documents from `/specs/010-spec-github-issues/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit tests for the new action are included (plan.md Testing and quickstart.md require them, mirroring `pr-comment.test.ts`).

**Organization**: Grouped by user story. Plan scope is the form + issue filing (US1/US2); US3 and US4 are satisfied by the action never using closing keywords and by guidance.

## Format: `[ID] [P?] [Story] Description`

Plugin root: `src/plugins/scaffolder-backend-module-github/` (abbreviated `PLUGIN/`). Template repo: external `ServerlessOpsIO/backstage-github-speckit-feature`.

## Phase 1: Setup

- [X] T001 Review `PLUGIN/src/actions/pr-comment.ts`, `pr-comment.test.ts`, and `common.ts` (`createUserOctokit`) to mirror structure, error handling, and test mocking for the new action

---

## Phase 2: Foundational

**Purpose**: Blocking prerequisites for all stories

- [ ] T002 Create `PLUGIN/src/actions/issue-create.ts` skeleton exporting `createGithubIssueAction` (id `x_github:issue:create`) with zod input schema per contracts/issue-create-action.md (`repoUrl`, `title`, `body`, optional `labels` string[], optional `userCredentialsSecretKey` default `USER_GITHUB_TOKEN`) and output schema (`issueUrl`, `issueNumber`); derive its idempotency key from the scaffolder task ID
- [ ] T003 Export the action in `PLUGIN/src/actions/index.ts` (`export * from './issue-create'`) and register `createGithubIssueAction()` in `PLUGIN/src/module.ts`

**Checkpoint**: Action is registered and type-checks.

---

## Phase 3: User Story 1 - Spec creation is linked to a tracking issue (P1) 🎯 MVP

**Goal**: Each successful form submission creates one new open GitHub issue (title = spec title, label = spec type, body in fixed layout) before `/speckit-specify` runs.

**Independent Test**: Submit the form against a test repo; confirm one open issue is created before `/speckit-specify`; retry that run and confirm no duplicate, then start a separate run and confirm a second issue is created.

### Tests for User Story 1

- [ ] T004 [P] [US1] Write `PLUGIN/src/actions/issue-create.test.ts` covering: title/labels/body passthrough, outputs `issueUrl`/`issueNumber`, missing user token error, non-`github.com` host error, API failure message `Failed to create issue in <owner>/<repo>: <message>`, same-run marker reuse, and distinct markers/issues across runs

### Implementation for User Story 1

- [ ] T005 [US1] Implement handler in `PLUGIN/src/actions/issue-create.ts`: parse `repoUrl`, read user token from task secrets, build client with `createUserOctokit`, call `POST /repos/{owner}/{repo}/issues` with title, body, labels; set outputs; throw on failure per contract
- [ ] T006 [US1] Implement run-scoped idempotency in `PLUGIN/src/actions/issue-create.ts`: append a hidden `<!-- spec-key: <task-id> -->` marker, search for it before creation, reuse its issue for the same run, and create a new issue for a distinct run (FR-003)
- [ ] T007 [US1] Ensure the action never uses closing keywords and never closes/reopens issues (contract; supports FR-008) in `PLUGIN/src/actions/issue-create.ts`
- [ ] T008 [US1] Add `x_github:issue:create` documentation (inputs, outputs, usage example, run-scoped idempotency) to `PLUGIN/README.md`

**Checkpoint**: US1 action works and is tested.

---

## Phase 4: User Story 2 - Single-page spec form (P2)

**Goal**: A single-page form presents the specified fields with guidance; required fields are enforced; completed content populates the issue.

**Independent Test**: Open Create → "Create feature spec"; verify fields, required markers, and issue body.

- [ ] T009 [US2] In `template-spec.yaml` (external template repo), add one `parameters` page "Spec" with fields per contracts/spec-form.md and data-model.md: `specType` (enum `feature|bug|documentation`, radio, default `feature`), `specTitle` (`minLength: 1`), `storySentence` (`minLength: 1`, description/placeholder "As a ____, I can ____"), `proposedSolution` (textarea, 10 rows), `additionalContext` (optional textarea, 5 rows), `acceptanceCriteria` (optional textarea, 5 rows, default `- [ ] ...`); `required: [specType, specTitle, storySentence, proposedSolution]`
- [ ] T010 [US2] In `template-spec.yaml`, request user credentials (`requestUserCredentials`) and add a `fileIssue` step before `/speckit-specify` using `x_github:issue:create` with title `${{ parameters.specTitle }}`, labels `['${{ parameters.specType }}']`, and body in the exact layout from contracts/spec-form.md (note the `##` heading-space caveat in research D5); expose issue number/URL to later steps
- [ ] T011 [US2] Confirm `template-spec.yaml` is registered in `app-config.production.yaml` (no change expected; edit only if missing)

**Checkpoint**: Form renders and files the issue.

---

## Phase 5: User Story 3 - PRs link to the spec's issue (P2)

**Goal**: Issue number is available and guidance encourages non-closing PR references; linking remains best effort.

**Independent Test**: Confirm template outputs expose the issue URL/number and provide non-closing reference guidance without blocking PR creation.

- [ ] T012 [US3] In `template-spec.yaml`, surface `issueUrl`/`issueNumber` in template `output.links` and provide guidance to downstream PR authors to use non-closing wording (e.g. "Related to #N", never "Closes/Fixes/Resolves"); do not block PR creation when the reference is omitted

---

## Phase 6: User Story 4 - Issue closed only by a human (P1)

**Goal**: Nothing automated closes the issue.

**Independent Test**: Merge a PR referencing the issue; issue stays open.

- [ ] T013 [P] [US4] Verify in `PLUGIN/src/actions/issue-create.test.ts` that the created issue payload/body contains no closing keywords and no state change calls are made
- [ ] T014 [US4] Document in `PLUGIN/README.md` that issues are opened only and PR references should be non-closing, with linking best effort

---

## Phase 7: Polish & Cross-Cutting

- [ ] T015 Run from `src/`: `yarn tsc:full`, `yarn lint:all`, `yarn test:all`, `yarn build:all` and fix failures
- [ ] T016 Walk through `quickstart.md` steps 1-5 against a test repo and record any deviations

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002, T003) → US1 (T004–T008) → US2 (T009–T011) → US3 (T012) → US4 (T013–T014) → Polish.
- US2 depends on the action existing (US1); T012 depends on T010; T013 depends on T004.
- T004 can be written in parallel with T005/T006 (same test-first pairing, different file).

## Parallel Example

- T004 (test file) alongside T005–T006 (implementation file).
- T008 (README) alongside T009 (external template repo) once T005 is done.
- T013 alongside T014.

## Implementation Strategy

- **MVP**: Phases 1–3 (the `x_github:issue:create` action, tested and documented), then add the form/step (US2) to expose it to users.
- Deliver incrementally: action → template form → issue outputs for PRs → verification.

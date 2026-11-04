---

description: "Task list for Skip CI for Spec-Only Changes"
---

# Tasks: Skip CI for Spec-Only Changes

**Input**: Design documents from `/specs/009-skip-ci-for-specs/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/change-classification.md, quickstart.md

**Tests**: A Bash classifier test script is included because plan.md and quickstart.md specify it (`.github/scripts/test-classify-changes.sh`).

**Organization**: Tasks are grouped by user story. Both stories are P1; US2 (mixed/code changes unchanged) builds on the same classifier and gating as US1 and verifies the fail-open and no-regression guarantees.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

## Path Conventions

CI-only change under `.github/`; `src/` is untouched. Constitution note goes in `.specify/memory/constitution.md`.

---

## Phase 1: Setup

**Purpose**: Scaffolding for the new script and tests

- [ ] T001 Create directory `.github/scripts/` and add an empty executable `.github/scripts/classify-changes.sh` with `#!/usr/bin/env bash` and `set -u` header
- [ ] T002 [P] Create executable `.github/scripts/test-classify-changes.sh` skeleton with helpers that build a temp git repo, make commits, run the classifier with `EVENT_NAME`/`BEFORE_SHA`/`AFTER_SHA`, and assert the printed `code_changed=` value

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The classifier and reusable workflow that every gated job depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Implement `.github/scripts/classify-changes.sh` per `contracts/change-classification.md` and `data-model.md`: read `EVENT_NAME`, `BEFORE_SHA`, `AFTER_SHA`; print `code_changed=false` only when the event is `push`, both SHAs resolve (`git cat-file -e`), `BEFORE_SHA` is not all zeros, `git diff --name-only --no-renames "$BEFORE_SHA" "$AFTER_SHA"` succeeds with a non-empty path list, and every path starts with `specs/` (top-level prefix only); otherwise print `code_changed=true`; always exit 0 (errors resolve to `true`)
- [ ] T004 Create reusable workflow `.github/workflows/changes.yml` (`on: workflow_call`, `permissions: contents: read`, no secrets/environments) with a `classify` job on `ubuntu-latest` that runs `actions/checkout` with `fetch-depth: 0`, runs `.github/scripts/classify-changes.sh` with `EVENT_NAME: ${{ github.event_name }}`, `BEFORE_SHA: ${{ github.event.before }}`, `AFTER_SHA: ${{ github.sha }}`, appends the result to `$GITHUB_OUTPUT`, and exposes workflow output `code_changed` (string) from the job output

**Checkpoint**: Classifier and reusable workflow exist; gating can begin

---

## Phase 3: User Story 1 - Spec-only changes skip build, test, and deployment work (Priority: P1) 🎯 MVP

**Goal**: A push whose final diff touches only top-level `specs/` runs no build, test, or deployment jobs, and required checks are not left pending.

**Independent Test**: Push a commit that only adds a file under `specs/`; `changes` runs, `build_infra`, `build_container` (and `deploy` on `main`) show Skipped, and required checks do not block merging.

### Tests for User Story 1

- [ ] T005 [US1] Add spec-only cases to `.github/scripts/test-classify-changes.sh` expecting `code_changed=false`: add, modify, delete, and rename within `specs/` (including a new nested subdirectory), and a push whose outside-`specs/` change is reverted so only spec changes remain (final-diff rule)

### Implementation for User Story 1

- [ ] T006 [P] [US1] Edit `.github/workflows/branch.yml`: add job `changes` with `uses: ./.github/workflows/changes.yml`; add `needs: changes` and `if: needs.changes.outputs.code_changed == 'true'` to `build_infra` and `build_container`; leave triggers and job names unchanged
- [ ] T007 [P] [US1] Edit `.github/workflows/main.yml`: add job `changes` with `uses: ./.github/workflows/changes.yml`; add `needs: changes` and `if: needs.changes.outputs.code_changed == 'true'` to `build_infra` and `build_container`; keep `deploy` as `needs: [build_infra, build_container]` (skipped automatically when they are skipped); leave triggers and job names unchanged
- [ ] T008 [US1] Run `bash .github/scripts/test-classify-changes.sh` and `actionlint .github/workflows/*.yml`; fix any failures in `.github/scripts/classify-changes.sh` or the workflows

**Checkpoint**: Spec-only pushes skip all real work; MVP complete

---

## Phase 4: User Story 2 - Mixed changes still run automation (Priority: P1)

**Goal**: Any final diff including a file outside top-level `specs/`, and any unknown situation, runs all existing jobs exactly as before.

**Independent Test**: Push one file under `specs/` plus one under `src/`; all jobs run. Dispatch runs all jobs.

### Tests for User Story 2

- [ ] T009 [US2] Add code/fail-open cases to `.github/scripts/test-classify-changes.sh` expecting `code_changed=true`: mixed `specs/` + `src/` change, code-only change, `src/specs/x`, `SPECS.md`, `specs-old/x`, move from `src/` into `specs/` (rename source counted), new branch (`BEFORE_SHA` all zeros), missing/unknown base SHA (force push), empty diff, and `EVENT_NAME` of `workflow_dispatch` and `schedule`

### Implementation for User Story 2

- [ ] T010 [US2] Fix any failing cases in `.github/scripts/classify-changes.sh` revealed by T009 (path matching must be exact top-level `specs/` prefix; every error path must print `code_changed=true`)
- [ ] T011 [US2] Verify `.github/workflows/branch.yml` and `.github/workflows/main.yml` job names, triggers (`workflow_dispatch`, `push`), steps, and `deploy` behavior are otherwise unchanged via `git diff`; confirm `workflow_dispatch` classifies as `true` so all jobs run

**Checkpoint**: Both stories verified; code and mixed changes behave as before

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T012 [P] Add a PATCH amendment (1.0.1) to `.specify/memory/constitution.md` Principle V recording that spec-only (`specs/`-only) changes are exempt from build/test/deploy validation; update the version line and Last Amended date and any sync impact comment at the top
- [ ] T013 [P] Document the consumer pattern for future workflows (`changes` job + `needs`/`if`) in a comment block at the top of `.github/workflows/changes.yml`, referencing `specs/009-skip-ci-for-specs/contracts/change-classification.md` (FR-004)
- [ ] T014 Run the `quickstart.md` local checks (`actionlint`, test script) and, after pushing a test branch, the GitHub scenarios table; confirm the `changes / classify` check is not configured as a required check unless desired

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **US1 / US2** → **Polish**
- T003 depends on T001; T004 depends on T003 (script path); T005 depends on T002 and T003
- US1: T006 and T007 depend on T004 and run in parallel; T008 depends on T005–T007
- US2: T009 depends on T002; T010 depends on T009; T011 depends on T006, T007
- T005 and T009 edit the same file, so run them sequentially
- Polish: T012 and T013 are independent; T014 runs last

### Parallel Examples

```text
Phase 1:  T001, T002
US1:      T006 (branch.yml), T007 (main.yml)
Polish:   T012 (constitution.md), T013 (changes.yml)
```

## Implementation Strategy

- **MVP**: Phases 1–3 (US1) deliver the skip behavior. Because the classifier fails open, this is safe to ship before US2 verification.
- **Incremental**: Add US2 tests and fixes, then polish (constitution amendment, docs).
- Merge via a PR containing both workflow edits so required check names remain unchanged.

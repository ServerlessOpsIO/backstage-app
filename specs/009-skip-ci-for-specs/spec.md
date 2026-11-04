# Feature Specification: Skip CI for Spec-Only Changes

**Feature Branch**: `009-skip-ci-for-specs`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "As an engineer I don't need GHA workflows to run when merging changes, including new files, to specs. When changes are pushed to or merged into branches, if changes are only under the `specs/` directory then this repo's GHA workflows do not run. Acceptance: changes made under `specs/` do not trigger any GHA workflows."

## Clarifications

### Session 2026-11-04

- Q: May the zero-run and mixed-change guarantees have exceptions for GitHub's documented file-filtering limits? → A: Yes (1A); documented platform-limit exceptions to SC-001 and SC-002 are accepted.
- Q: If required checks block a spec-only PR because no workflow runs, how should this feature handle that conflict? → A: Allow lightweight workflow runs (2C), replacing zero runs with no build, test, or deployment work; preserve required validation for code and mixed changes.
- Q: Should workflows run when a push changes a file outside `specs/` and then fully reverts it, leaving only spec changes in the final diff? → A: Skip build, test, and deployment work based on the final diff (3A), not individual commits.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Spec-only changes skip build, test, and deployment work (Priority: P1)

An engineer updates, adds, renames, or deletes documents under `specs/` and pushes them to a branch or merges them into a branch. No build, test, or deployment work runs for that change. Lightweight workflow runs may classify changes and report checks needed for mergeability.

**Why this priority**: This is the whole feature. It removes wasted build/deploy runs, runner cost, and noisy check results for documentation-only changes.

**Independent Test**: Push a commit that only adds a new file under `specs/` and confirm that no build, test, or deployment work runs and required checks do not block merging.

**Acceptance Scenarios**:

1. **Given** a branch, **When** an engineer pushes a commit that only modifies existing files under `specs/`, **Then** no build, test, or deployment work runs.
2. **Given** a branch, **When** an engineer pushes a commit that only adds new files under `specs/` (including new subdirectories), **Then** no build, test, or deployment work runs.
3. **Given** a pull request containing only changes under `specs/`, **When** it is merged into a branch, **Then** no build, test, or deployment work runs because of the merge.
4. **Given** a commit that only deletes or renames files within `specs/`, **When** it is pushed or merged, **Then** no build, test, or deployment work runs.
5. **Given** a spec-only pull request targeting a protected branch, **When** its lightweight checks complete successfully, **Then** required status checks do not block merging; other merge requirements remain unchanged.

---

### User Story 2 - Mixed changes still run automation (Priority: P1)

An engineer pushes or merges a change whose final diff touches both `specs/` and files elsewhere in the repository. All existing build, test, and deployment work still runs under the same triggering conditions, even if workflow/check structure changes.

**Why this priority**: Skipping automation must never hide validation of real code, configuration, or deployment changes.

**Independent Test**: Push a commit that changes one file under `specs/` and one file outside it; confirm the usual workflows run.

**Acceptance Scenarios**:

1. **Given** a commit changing files both under `specs/` and outside it, **When** it is pushed or merged, **Then** all build, test, and deployment work that would normally run still runs.
2. **Given** a commit that changes no files under `specs/`, **When** it is pushed or merged, **Then** existing build, test, and deployment behavior is unchanged.
3. **Given** a code or mixed-change pull request with a failed required validation, **When** lightweight checks complete, **Then** they do not override that failure or allow merging.

---

### Edge Cases

- A multi-commit push is classified using the final diff between the before-and-after trees. If outside-spec changes are fully reverted and only spec changes remain, build, test, and deployment work is skipped.
- Files with `spec`-like names outside the top-level `specs/` directory (e.g. `src/specs/`, `SPECS.md`) are not exempt and still trigger workflows.
- Scheduled or manually dispatched runs are not tied to file changes and are unaffected.
- Required status checks on protected branches: spec-only pull requests must not be blocked by missing checks; lightweight workflow runs are permitted (see Assumptions).
- GitHub's documented file-filtering limits are accepted exceptions where applicable: pushes exceeding 1,000 commits or diff timeouts may run otherwise skipped work, and the 300-file filtering limit may miss outside-spec changes. Acceptance scenarios and SC-001/SC-002 are evaluated within those limits.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Changes whose final diff consists solely of files under the top-level `specs/` directory MUST NOT run build, test, or deployment work when pushed to or merged into any branch, subject to the documented platform-limit exceptions. Lightweight change classification and status-check reporting MAY run.
- **FR-002**: The exemption MUST apply to added, modified, deleted, and renamed files, at any depth under `specs/`.
- **FR-003**: Changes whose final diff includes at least one file outside `specs/` MUST continue to run the same build, test, and deployment work under the same triggering conditions as before this feature, subject to the documented platform-limit exceptions.
- **FR-004**: The exemption MUST apply to every workflow in the repository, including any added in the future.
- **FR-005**: Non-file-change triggers (manual dispatch, schedules) MUST be unaffected.
- **FR-006**: Required status checks MUST permit spec-only pull requests to merge without build, test, or deployment work, while continuing to require successful applicable validation for code and mixed changes. Lightweight successful checks MUST NOT mask failed required validation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Within the documented platform limits, 100% of pushes and merges whose final diff changes only files under `specs/` run no build, test, or deployment work; lightweight workflow runs are permitted.
- **SC-002**: Within the documented platform limits, 100% of pushes and merges whose final diff changes at least one file outside `specs/` run the same build, test, and deployment work as before.
- **SC-003**: Engineers can verify the behavior in under 5 minutes by pushing a spec-only commit and viewing its workflow jobs and checks.
- **SC-004**: A spec-only pull request satisfies required status checks without build, test, or deployment work, and a code or mixed-change pull request with failed required validation remains blocked from merging.

## Assumptions

- "Branches" means all branches the repository's workflows currently respond to, including the default branch.
- Only the top-level `specs/` directory is exempt.
- Required-check wiring may be restructured, with maintainer-approved repository-settings changes if necessary. Making validation optional for code or mixed changes is not permitted.
- The exemption covers push triggers and pull-request triggers where configured; merging does not inherently trigger pull-request workflows, and this feature does not require adding such triggers.

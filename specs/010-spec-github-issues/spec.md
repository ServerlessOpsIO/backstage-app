# Feature Specification: Spec-Tracked GitHub Issues

**Feature Branch**: `010-spec-github-issues`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "As an engineer my specs are recorded as Github issues. When creating a spec the work should be recorded in Github issues. While working on new features the work is not being captured in the system we use for tracking work. Additionally to improve specs the user should be shown the fields needed to write a good spec together on a single page. Acceptance criteria: a newly created spec results in a new GitHub issue; PRs should reference the issue when practical so reviewing the issue can link to the work; the issue is not automatically closed and requires a human to close it, since a feature may need multiple feature branch commits."

## Clarifications

### Session 2026-11-04

- Q: When should the GitHub issue be created relative to `/speckit-specify`? → A: Create the issue before running `/speckit-specify`; do not mark it as a draft.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Spec creation is linked to a tracking issue (Priority: P1)

The engineer fills in a single-page spec form. The workflow creates an open GitHub issue from those answers before `/speckit-specify` runs, so spec authoring can link to an existing issue and the work is visible in the team's tracking system from the start.

**Why this priority**: Without the issue, feature work is invisible to the tracking system. This is the core problem.

**Independent Test**: Submit the spec form, confirm it creates an open issue, then run `/speckit-specify` and confirm the resulting spec links to that issue.

**Acceptance Scenarios**:

1. **Given** an engineer submits the spec form, **When** the workflow creates the issue and `/speckit-specify` runs, **Then** the spec links to the issue and the issue body contains the submitted form content.
2. **Given** a spec has an associated issue, **When** the engineer opens the spec, **Then** it shows the issue number and link.
3. **Given** no issue exists for the feature, **When** the engineer runs `/speckit-specify`, **Then** the engineer is told to create an issue before authoring begins.
4. **Given** an engineer re-runs the spec creation workflow, **When** the form is submitted, **Then** a new issue is created rather than reusing the issue from an earlier run.

---

### User Story 2 - Single-page spec form (Priority: P2)

The engineer is shown one form page with fields for spec type, title, story sentence, proposed solution, additional context, and acceptance criteria.

**Why this priority**: Improves spec quality, and the form content populates the issue. It is valuable but the issue tracking works without it.

**Independent Test**: Open the spec form and confirm all specified fields appear on the same page, required fields are enforced, and the submitted content appears in the issue.

**Acceptance Scenarios**:

1. **Given** an engineer starts a new spec, **When** the form opens, **Then** all fields are presented together on a single page with the specified guidance.
2. **Given** the engineer submits the form, **When** a required field is empty, **Then** the form identifies that field as incomplete and does not create the issue.
3. **Given** the engineer completes the required fields, **When** the form is submitted, **Then** the issue body contains the submitted values in the specified layout.

---

### User Story 3 - Pull requests link to the spec's issue (Priority: P2)

The workflow provides the issue reference and encourages pull requests for spec work to include it, so the issue can show related PRs when authors add the reference.

**Why this priority**: Gives traceability from the issue to the actual work.

**Independent Test**: Confirm the workflow exposes the issue URL and number and gives PR authors non-closing reference guidance.

**Acceptance Scenarios**:

1. **Given** a spec with an issue, **When** a PR is prepared for that spec's work, **Then** the workflow provides the issue reference and guidance to include a non-closing reference; inclusion is best effort.
2. **Given** a feature requires multiple PRs, **When** authors include the provided reference, **Then** each PR links to the same issue.

---

### User Story 4 - Issue is closed only by a human (Priority: P1)

Merging a PR never automatically closes the spec's issue. A person closes it when the whole feature is complete.

**Why this priority**: A feature may span several PRs; premature auto-closure would misrepresent progress.

**Independent Test**: Merge a PR referencing the issue and confirm the issue remains open.

**Acceptance Scenarios**:

1. **Given** a PR references the issue, **When** the PR is merged, **Then** the issue remains open.
2. **Given** all work is done, **When** a person closes the issue manually, **Then** it closes without any automation reopening it.

---

### Edge Cases

- No issue exists before `/speckit-specify` runs: the engineer is told to create an issue before authoring begins.
- The engineer lacks permission to create issues in the repository.
- A spec is abandoned: the issue remains open for a human to close.
- A spec creation workflow is re-run: it creates a new issue rather than reusing the issue from an earlier run. Retries within one workflow run reuse that run's issue.
- A PR relates to a spec but the engineer omits the reference: issue-linking guidance is best effort and does not block the PR.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The spec creation workflow MUST create an open, non-draft GitHub issue in the project's repository before `/speckit-specify` runs.
- **FR-002**: The spec MUST record the issue number and link, and the issue MUST identify the spec.
- **FR-003**: Each new run of the spec creation workflow MUST create a new issue rather than reuse an issue from an earlier run. Retries within the same run MUST reuse that run's issue.
- **FR-004**: Spec authoring MUST present spec type, title, story sentence, proposed solution, additional context, and acceptance criteria together on a single form page.
- **FR-005**: The form MUST identify incomplete required fields and prevent issue creation until they are completed.
- **FR-006**: The issue content MUST reflect the values submitted through the spec form.
- **FR-007**: The workflow SHOULD provide the issue number/link and guidance for adding a non-closing reference to PRs for the spec's work. PR linking is best effort and MUST NOT be a blocker.
- **FR-008**: Merging a PR MUST NOT automatically close the issue; only a human may close it.
- **FR-009**: If no issue exists when `/speckit-specify` runs, the engineer MUST be told to create an issue before authoring begins.
- **FR-010**: The feature MUST NOT store credentials in tracked files.

### Key Entities

- **Spec**: The feature specification, authored from a single-page form, with a reference to its issue.
- **Spec Form**: The single-page set of type, title, story, proposed solution, additional context, and acceptance criteria fields.
- **Tracking Issue**: The GitHub issue representing the feature's work; open until a human closes it.
- **Pull Request**: A unit of work for the feature that may include a non-closing reference to the tracking issue.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly created specs have exactly one linked GitHub issue.
- **SC-002**: Every issue created by the workflow exposes its issue number and URL to template outputs for PR authors; PR references remain best effort.
- **SC-003**: 0 spec issues are closed automatically by a PR merge.
- **SC-004**: An engineer can submit the single-page form with all required fields completed in one scaffolder run.
- **SC-005**: Each workflow run creates exactly one issue; retrying the same run creates no additional issue, while a separate run creates a new issue.

## Assumptions

- Engineers are authenticated to GitHub with permission to create issues in the repository.
- The GitHub repository hosting the spec is the same one where the issue is created.
- The form's required fields are spec type, spec title, story sentence, and proposed solution; additional context is optional and acceptance criteria is pre-populated but optional.
- PR references use non-closing wording when provided, but adding the reference is best effort and is not enforced.
- Existing specs (001–007) are out of scope and are not retroactively given issues.

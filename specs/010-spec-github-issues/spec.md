# Feature Specification: Spec-Tracked GitHub Issues

**Feature Branch**: `010-spec-github-issues`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "As an engineer my specs are recorded as Github issues. When creating a spec the work should be recorded in Github issues. While working on new features the work is not being captured in the system we use for tracking work. Additionally to improve specs the user should be shown different sections needed to write a good spec. The user will fill out each section individually. Acceptance criteria: a newly created spec results in a new GitHub issue; each PR related to the spec references the issue so reviewing the issue links to the work; the issue is not automatically closed and requires a human to close it, since a feature may need multiple feature branch commits."

## Clarifications

### Session 2026-11-04

- Q: At what point in section-by-section authoring should the GitHub issue first be created? → A: Create the issue before running `/speckit-specify`; do not mark it as a draft.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Spec creation is linked to a tracking issue (Priority: P1)

Before running `/speckit-specify`, an engineer creates an open GitHub issue in the repository to represent the feature. Spec authoring links to that existing issue, so the work is visible in the team's tracking system from the start.

**Why this priority**: Without the issue, feature work is invisible to the tracking system. This is the core problem.

**Independent Test**: Create a GitHub issue, run `/speckit-specify`, and confirm the resulting spec links to that issue and the issue contains the spec content.

**Acceptance Scenarios**:

1. **Given** an engineer creates an open, non-draft GitHub issue for a feature, **When** they run `/speckit-specify`, **Then** the spec links to that issue and the issue body contains the spec content.
2. **Given** a spec has an associated issue, **When** the engineer opens the spec, **Then** it shows the issue number and link.
3. **Given** no issue exists for the feature, **When** the engineer runs `/speckit-specify`, **Then** the engineer is told to create an issue before authoring begins.
4. **Given** a spec already has an issue, **When** the engineer re-runs spec creation or updates the spec, **Then** no duplicate issue is created.

---

### User Story 2 - Guided, section-by-section spec authoring (Priority: P2)

The engineer is shown each section needed for a good spec (e.g., user scenarios, requirements, success criteria, assumptions) one at a time, with a short explanation of what belongs in it, and fills each in individually.

**Why this priority**: Improves spec quality, and the sectioned content is what populates the issue. It is valuable but the issue tracking works without it.

**Independent Test**: Start a new spec and confirm each required section is presented separately with guidance, and that the completed content appears in the spec and issue.

**Acceptance Scenarios**:

1. **Given** an engineer starts a new spec, **When** authoring begins, **Then** each required section is presented individually with a description of what a good answer contains.
2. **Given** the engineer is on a section, **When** they submit content, **Then** it is recorded under that section and the next section is presented.
3. **Given** the engineer leaves a required section empty, **When** they try to finish, **Then** they are told which sections are incomplete.
4. **Given** all sections are completed, **When** the spec is finalized, **Then** the issue reflects the full sectioned content.

---

### User Story 3 - Pull requests link to the spec's issue (Priority: P2)

Every pull request for work belonging to a spec references the spec's issue, so viewing the issue shows all related PRs.

**Why this priority**: Gives traceability from the issue to the actual work.

**Independent Test**: Open a PR from a spec's feature branch and confirm the issue shows a link to that PR.

**Acceptance Scenarios**:

1. **Given** a spec with an issue, **When** a PR is opened for that spec's work, **Then** the PR description references the issue and the issue shows the PR as linked.
2. **Given** a feature requires multiple PRs, **When** each is opened, **Then** each references the same issue.

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
- Spec content is edited after the issue is created: the issue can be updated to match without creating a new one.
- A PR relates to a spec but the engineer forgot the reference: the missing link is detectable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Before `/speckit-specify` runs, an engineer MUST create an open, non-draft GitHub issue in the project's repository for the feature.
- **FR-002**: The spec MUST record the issue number and link, and the issue MUST identify the spec.
- **FR-003**: Re-running or updating a spec MUST NOT create duplicate issues; it MUST update the existing issue instead.
- **FR-004**: Spec authoring MUST present each required section individually, with guidance on its content, and capture the response per section.
- **FR-005**: The system MUST indicate which required sections are incomplete before a spec is finalized.
- **FR-006**: The issue content MUST reflect the completed spec sections.
- **FR-007**: PRs for a spec's work MUST reference the spec's issue in a way that links the PR to the issue without closing it.
- **FR-008**: Merging a PR MUST NOT automatically close the issue; only a human may close it.
- **FR-009**: If no issue exists when `/speckit-specify` runs, the engineer MUST be told to create an issue before authoring begins.
- **FR-010**: The feature MUST NOT store credentials in tracked files.

### Key Entities

- **Spec**: The feature specification, made of individual sections, with a reference to its issue.
- **Spec Section**: A named part of a spec (e.g., scenarios, requirements) with guidance and completion state.
- **Tracking Issue**: The GitHub issue representing the feature's work; open until a human closes it.
- **Pull Request**: A unit of work for the feature that links to the tracking issue.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly created specs have exactly one linked GitHub issue.
- **SC-002**: 100% of PRs for spec work link to the spec's issue, visible from the issue.
- **SC-003**: 0 spec issues are closed automatically by a PR merge.
- **SC-004**: An engineer can complete all spec sections in a single guided session without needing to consult external documentation.
- **SC-005**: Zero duplicate issues are created when a spec is re-run or edited.

## Assumptions

- Engineers are authenticated to GitHub with permission to create issues in the repository.
- The GitHub repository hosting the spec is the same one where the issue is created.
- Required sections are those in the existing spec template: user scenarios, requirements, success criteria, and assumptions.
- Linking PRs uses non-closing references; enforcing it on every PR is via guidance and detection rather than blocking, unless later specified.
- Existing specs (001–007) are out of scope and are not retroactively given issues.

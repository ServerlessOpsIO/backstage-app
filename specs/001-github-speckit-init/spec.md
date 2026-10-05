# Feature Specification: GitHub Spec Kit Initialization Action

**Feature Branch**: `copilot/add-new-scaffolder-action-github-copilot-speckit-i`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "Add a new scaffolder action named github:copilot:speckit:init. When a scaffolder step uses this action the command `specify init --non-interactive  --force .` will be run at the top-level of the newly created project."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initialize Spec Kit in a scaffolded project (Priority: P1)

A template author adds the GitHub Copilot Spec Kit initialization action to a scaffolder template so that each newly created project is initialized for Spec Kit without requiring a separate manual setup step.

**Why this priority**: This is the core value of the action: projects are ready for Spec Kit workflows as part of their creation.

**Independent Test**: Execute a template containing the action and verify the requested initialization command runs from the root of its newly created project.

**Acceptance Scenarios**:

1. **Given** a scaffolder task has created a project workspace, **When** its template invokes `github:copilot:speckit:init`, **Then** the action runs `specify init --non-interactive  --force .` with that project root as its working directory.
2. **Given** the initialization command completes successfully, **When** the scaffolder task continues, **Then** the action completes successfully and the template can proceed.

### User Story 2 - Detect initialization failures (Priority: P2)

A template author receives a failed scaffolder step when the initialization command cannot run or reports failure, so that an incomplete project setup is not reported as successful.

**Why this priority**: Clear failure behavior prevents users from relying on projects that were not initialized.

**Independent Test**: Run the action with the initialization command unavailable or returning a failure status and verify that the scaffolder step fails.

**Acceptance Scenarios**:

1. **Given** the initialization command cannot be started or exits unsuccessfully, **When** the action runs, **Then** the action reports failure to the scaffolder task.

### Edge Cases

- The action must run in the project root even when the scaffolder workspace path is not the backend process's current directory.
- If `specify` is unavailable in the task runtime, the action must fail rather than silently skip initialization.
- If the command exits unsuccessfully, the scaffolder task must not treat the action as successful.
- If a template invokes the action more than once, each invocation must run the specified command in the project root.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The scaffolder MUST expose an action with the identifier `github:copilot:speckit:init`.
- **FR-002**: When invoked for a newly created project, the action MUST run the exact command `specify init --non-interactive  --force .` from the top-level directory of that project.
- **FR-003**: The action MUST wait for command completion and report success only when the command completes successfully.
- **FR-004**: If the command cannot be started or completes unsuccessfully, the action MUST fail the scaffolder step with an actionable failure indication.
- **FR-005**: The action MUST NOT require additional user-provided inputs to perform this initialization.

### Configuration, Secrets, and Deployment Requirements *(mandatory)*

- **CR-001**: The source-of-truth change belongs under `src/`, in the existing GitHub Copilot scaffolder backend module.
- **CR-002**: No new application configuration keys or environment variables are required. The task runtime must make the `specify` command available; if it is unavailable, the action fails.
- **CR-003**: The feature MUST NOT require or introduce tracked secrets.
- **CR-004**: The feature adds no routing, authentication, network access, container, health-check, or ECS behavior. The deployed scaffolder runtime must provide the `specify` executable for the action to succeed.
- **CR-005**: Automated coverage MUST verify command invocation, project-root working directory, and failure propagation. Validate the module with its focused package tests, lint, and build, and run the repository-required `yarn tsc:full`, `yarn build:all`, `yarn test:all`, and `yarn lint:all` from `src/`.

### Documentation and Operational Impact *(mandatory)*

- **DO-001**: Document the new action identifier and its use in the GitHub Copilot scaffolder module documentation.
- **DO-002**: The task runtime must have the `specify` command available. Missing-command and non-zero-exit failures are surfaced through the scaffolder step. No new secrets, schedules, or ownership metadata are introduced.

### Key Entities

- **Scaffolder action invocation**: A template step that requests Spec Kit initialization for its generated project.
- **Project workspace**: The newly created project directory; its top-level directory is the command's working directory.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of successful action runs, the specified initialization command is run from the generated project's top-level directory.
- **SC-002**: Template authors can request initialization using the action identifier without supplying additional action inputs.
- **SC-003**: 100% of command-start failures and unsuccessful command exits cause the scaffolder step to fail.

## Assumptions

- The action is used after the scaffolder has created the project workspace.
- The `specify` executable is installed or otherwise made available to the backend task runtime.
- Existing scaffolder error reporting is the appropriate channel for surfacing command failures.

## Constitution Alignment *(mandatory)*

- **Architecture Boundaries**: Implement the action within `src/plugins/scaffolder-backend-module-github-copilot` and register it through that module's scaffolder action extension point.
- **Configuration Contract**: No new configuration files, keys, or environment variables are needed; the operational prerequisite is an available `specify` executable in the task runtime.
- **Secrets Posture**: The action does not require credentials or handle secrets.
- **Validation Plan**: From `src/`, run the focused GitHub Copilot module tests, lint, and build, followed by `yarn tsc:full`, `yarn build:all`, `yarn test:all`, and `yarn lint:all`.
- **Documentation Impact**: Update the GitHub Copilot scaffolder module README with the action identifier and runtime prerequisite.

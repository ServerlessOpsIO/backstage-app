# Research: GitHub Spec Kit Initialization Action

## Decision 1: Implement as a Backstage scaffolder action in the existing module

- **Decision**: Add a standalone action factory and register it using the
  existing `scaffolderActionsExtensionPoint`.
- **Rationale**: The GitHub Copilot module already owns related scaffolder
  actions and exposes them through this extension point. This keeps the action
  discoverable without adding another package or changing backend composition.
- **Alternatives considered**: A separate plugin module or a template shell step.
  Both duplicate existing module ownership or bypass a reusable action.

## Decision 2: Run the process directly with a fixed argument list

- **Decision**: Start `specify` with arguments `init`, `--non-interactive`,
  `--force`, and `.` and set the process working directory to
  `ctx.workspacePath`.
- **Rationale**: An argv-based child process avoids shell interpretation, and
  the scaffolder task context identifies the generated workspace independently
  of the backend process's current directory. Awaiting process completion lets
  failures propagate to the scaffolder.
- **Alternatives considered**: Running a shell command string, which adds
  quoting and injection risks without a need for shell features; running from
  the backend current directory, which may target the wrong project.

## Decision 3: Require no action inputs and add no dependencies

- **Decision**: Expose an action without required inputs and use Node.js process
  APIs already available to the module.
- **Rationale**: The operation is fixed by the feature requirements, and the
  existing package targets Node.js.
- **Alternatives considered**: User-configurable command, args, or working
  directory. These are outside scope and would weaken the guarantee that the
  generated project root is initialized.

## Resolved Clarifications

No unresolved questions remain. The task runtime must provide `specify`; the
action fails visibly if the executable is missing or exits unsuccessfully.

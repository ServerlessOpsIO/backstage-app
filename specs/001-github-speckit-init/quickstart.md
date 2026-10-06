# Quickstart: GitHub Spec Kit Initialization Action

## Prerequisites

- The Backstage scaffolder backend includes
  `@internal/backstage-plugin-scaffolder-backend-module-github-copilot`.
- The scaffolder task runtime has the `specify` executable on its `PATH`.
- The template has generated the project's workspace before this step runs.

## Validate

1. Run the GitHub Copilot module's focused test suite from `src/`:

   ```sh
   yarn workspace @internal/backstage-plugin-scaffolder-backend-module-github-copilot test
   ```

2. In a scaffolder template, add the action step shown in
   [the action contract](./contracts/scaffolder-action.md).
3. Execute the template and verify Spec Kit initializes files in the generated
   project root, not in the backend's current directory.
4. Verify the action fails the task when `specify` is unavailable or exits
   unsuccessfully.

The process invocation and expected failure states are specified in
[the data model](./data-model.md).

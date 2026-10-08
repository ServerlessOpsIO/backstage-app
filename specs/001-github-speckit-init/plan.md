# Implementation Plan: GitHub Spec Kit Initialization Action

**Branch**: `copilot/add-new-scaffolder-action-github-copilot-speckit-i` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-github-speckit-init/spec.md`

## Summary

Add and register a no-input scaffolder action, `github:copilot:speckit:init`, in
the existing GitHub Copilot backend module. The action will start `specify`
with arguments `init --non-interactive --force .` using the task workspace as
its working directory, wait for completion, and surface process errors and
non-zero exits to the scaffolder task.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 24
**Primary Dependencies**: Backstage scaffolder-node; Node.js `child_process`
**Storage**: N/A
**Testing**: Jest via the module's Backstage package test command
**Target Platform**: Node.js backend process used by Backstage scaffolder
**Project Type**: Backstage backend plugin module
**Performance Goals**: Wait for one local initialization process; no additional performance target
**Constraints**: Must execute in `ctx.workspacePath`; do not invoke a shell; missing executable and non-zero exit must fail the action
**Scale/Scope**: One action, registered in the existing GitHub Copilot module; no new configuration or dependencies

## Constitution Check

- **Architecture Boundaries**: Pass. The action remains in the existing
  `src/plugins/scaffolder-backend-module-github-copilot` package and is
  registered through the scaffolder actions extension point.
- **Catalog Integrity**: Pass. The action has deterministic process behavior,
  propagates failures, and introduces no catalog entity writes.
- **Environment-Driven Configuration**: Pass. No configuration is added; the
  executable is an explicit runtime prerequisite.
- **Secrets and Least Privilege**: Pass. No credentials or network access are
  needed.
- **Validation and Deployment Integrity**: Pass with implementation tests and
  package validation; repository-wide commands remain the final validation
  requirements for application changes.
- **Operational Guardrails**: Pass. The action runs a fixed executable and
  argument list without shell interpolation and documents the runtime
  prerequisite.

## Project Structure

### Documentation (this feature)

```text
specs/001-github-speckit-init/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── scaffolder-action.md
```

### Source Code

```text
src/plugins/scaffolder-backend-module-github-copilot/
├── README.md
└── src/
    ├── actions/
    │   ├── index.ts
    │   ├── speckit-init.ts
    │   └── speckit-init.test.ts
    └── module.ts
```

**Structure Decision**: Extend the current GitHub Copilot scaffolder backend
module and follow its existing action export and module registration pattern.
The action's unit test stays beside its implementation.

## Complexity Tracking

No constitution violations or additional architectural complexity.

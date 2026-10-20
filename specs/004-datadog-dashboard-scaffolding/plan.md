# Implementation Plan: Scaffolder Datadog Dashboard Action Plugin

**Branch**: `004-datadog-dashboard-scaffolding` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-datadog-dashboard-scaffolding/spec.md`

## Summary

Extend the existing Datadog scaffolder backend module already in the repository
(`src/plugins/scaffolder-backend-module-datadog`) with a new action,
`x_datadog:dashboard:create`, to provision Datadog dashboard baselines during
project scaffolding. The action will accept a stable project key and one or
more baseline selections with project-specific display values, enforce
validation and idempotency, update only scaffolder-managed dashboards, report
per-dashboard outcomes, and fail the step when any required dashboard fails.
The change also requires a proper module README documenting available actions,
configuration, and template usage.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 24
**Primary Dependencies**: `@backstage/backend-plugin-api`,
`@backstage/plugin-scaffolder-node`, `@backstage/config`, Datadog Dashboard
REST APIs via `fetch`
**Storage**: N/A (runtime API integration only)
**Testing**: Jest package tests in
`src/plugins/scaffolder-backend-module-datadog`, plus repository validation
gates for `src/`
**Target Platform**: Backstage backend scaffolder runtime
**Project Type**: Existing Backstage backend plugin module extension
**Performance Goals**: Process all requested dashboards in one scaffolder step
and emit per-dashboard outcomes without hidden retries
**Constraints**: Single platform-configured Datadog account; dashboard identity
must be stable across retries with `projectKey + dashboardName`; update only
scaffolder-managed dashboards; preserve successful dashboards on partial failure
**Scale/Scope**: Add one action (`x_datadog:dashboard:create`) and supporting
model/validation helpers, tests, module registration updates, contract docs, and
plugin README documentation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate

- **Architecture Boundaries**: Pass. Reuse and extend the existing Datadog
  scaffolder backend module under `src/plugins/` instead of introducing a
  parallel plugin.
- **Catalog Integrity**: Pass. The action defines deterministic idempotent
  behavior, explicit failure semantics, and per-dashboard traceable outcomes.
- **Environment-Driven Configuration**: Pass. Datadog credentials/account
  context remain runtime-configured (`scaffolder.datadog.*`); templates do not
  choose accounts.
- **Secrets and Least Privilege**: Pass. No secrets in template input or source
  docs; Datadog credentials remain environment-backed.
- **Validation and Deployment Integrity**: Pass. Plan includes focused module
  tests and repository-required validation commands for `src/` changes.
- **Operational Guardrails**: Pass. Fail-closed behavior for invalid inputs,
  unmanaged-dashboard collisions, and API failures is explicit.

### Post-Phase 1 Re-check

- **Status**: Pass. Research, data model, contract, and quickstart preserve
  constitutional constraints with no required exceptions.

## Project Structure

### Documentation (this feature)

```text
specs/004-datadog-dashboard-scaffolding/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── scaffolder-action.md
```

### Source Code

```text
src/plugins/scaffolder-backend-module-datadog/
├── README.md
├── package.json
└── src/
    ├── index.ts
    ├── module.ts
    └── actions/
        ├── index.ts
        ├── alarm/create.ts
        ├── alarm/create.test.ts
        ├── dashboard/create.ts
        └── dashboard/create.test.ts

src/packages/backend/src/index.ts
src/app-config.yaml
src/app-config.production.yaml
src/app-config.home.yaml
```

**Structure Decision**: Reuse the existing Datadog module and add the dashboard
action in the same package so Datadog credentials, API integration patterns,
and module registration remain centralized. Add/update module-level README
documentation in that package rather than scattering action usage details across
unrelated docs.

## Complexity Tracking

No constitution violations or complexity exemptions.

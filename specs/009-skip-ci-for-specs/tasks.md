# Tasks: Skip CI for Documentation and Spec Changes

**Input**: Implementation recorded in [plan.md](./plan.md) and commit
`ec97178` (`ignore CI on specs and docs`).

**Status**: The implementation tasks below are complete.

## User Story 1 - Ignore configured documentation and spec paths on pushes

**Independent check**: Confirm both push triggers ignore `docs/**` and
`specs/*`, while their existing branch filters, `workflow_dispatch` triggers,
and jobs remain unchanged.

- [x] T001 [US1] Add `paths-ignore` patterns `docs/**` and `specs/**` to the push trigger in `.github/workflows/branch.yml`
- [x] T002 [P] [US1] Add `paths-ignore` patterns `docs/**` and `specs/**` to the push trigger in `.github/workflows/main.yml`

## Execution

T001 and T002 were implemented together in commit `ec97178`. No classifier,
new workflow, script, or automated test was added for this configuration-only
change.

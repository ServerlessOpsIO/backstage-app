# Quickstart: Validate Skip-CI for Specs

## Prerequisites
- Feature merged to a test branch; `actionlint` available locally (optional).

## Local checks
1. `actionlint .github/workflows/*.yml`
2. `bash .github/scripts/test-classify-changes.sh` — expect all cases pass (spec-only add/modify/delete/rename, mixed, `src/specs/`, `SPECS.md`, new branch, missing base, revert-to-spec-only, empty diff).

## GitHub scenarios (see [contract](./contracts/change-classification.md))
| Push | Expected |
|------|----------|
| Only a new file under `specs/` | `changes` runs; `build_infra`, `build_container` (and `deploy` on `main`) show Skipped |
| One file under `specs/` + one under `src/` | All jobs run as before |
| Code-only change | All jobs run as before |
| Code change then revert within one push, specs remain | Build/test/deploy skipped |
| Manual dispatch | All jobs run |
| Spec-only PR to protected branch | Required checks satisfied; merge not blocked |
| Code PR with failing validation | Still blocked |

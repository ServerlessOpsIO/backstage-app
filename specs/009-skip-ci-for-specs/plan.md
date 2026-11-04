# Implementation Plan: Skip CI for Spec-Only Changes

**Branch**: `009-skip-ci-for-specs` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-skip-ci-for-specs/spec.md`

## Summary

Pushes whose final diff touches only top-level `specs/` must run no build, test, or deployment work, while still letting spec-only PRs satisfy required checks. Approach: a reusable workflow (`changes.yml`) runs a lightweight classifier (before..after final diff, via a shell script) and exposes `code_changed`. `main.yml` and `branch.yml` gate every real job on it with job-level `if:`. Skipped jobs report as successful to branch protection, so required checks are not left pending (which a trigger-level `paths-ignore` would cause). Unknown situations (new branch, missing base, force-push, dispatch) fail open to "code changed".

## Technical Context

**Language/Version**: GitHub Actions YAML; POSIX/Bash script for classification

**Primary Dependencies**: `actions/checkout`; git (no third-party path-filter action)

**Storage**: N/A

**Testing**: `actionlint` on workflows; Bash test script exercising the classifier against temp git repos; manual push scenarios in [quickstart.md](./quickstart.md)

**Target Platform**: GitHub-hosted `ubuntu-latest` runners

**Project Type**: CI/CD configuration (no application code changes)

**Performance Goals**: Classifier job finishes in well under 1 minute

**Constraints**: Only top-level `specs/` is exempt; code/mixed changes behave exactly as today; schedule/dispatch unaffected; GitHub diff limits (1,000 commits, 300 files) are accepted exceptions, and the classifier fails open

**Scale/Scope**: 2 existing workflows plus 1 new reusable workflow and 1 script

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Architecture Boundaries | Pass | Only `.github/` assets change; `src/` untouched |
| II. Catalog Integrity | Pass | N/A |
| III. Environment-Driven Configuration | Pass | No new config or env vars |
| IV. Secrets and Least Privilege | Pass | Classifier job has `contents: read` only and uses no secrets, AWS credentials, or environments |
| V. Validation and Deployment Integrity | Pass, with note | Validation for code/mixed changes is unchanged. Spec-only changes (docs, not source) skip it; record this exemption with a PATCH constitution amendment (1.0.1) in the implementing change |
| Delivery Workflow | Pass | Deployment impact: `deploy` is skipped for spec-only pushes to `main`; no runtime change |

Post-design re-check: no violations; Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/009-skip-ci-for-specs/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── change-classification.md
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
.github/
├── scripts/
│   ├── classify-changes.sh        # new: final-diff classifier
│   └── test-classify-changes.sh   # new: temp-repo tests
└── workflows/
    ├── changes.yml                # new: reusable (workflow_call) classifier
    ├── branch.yml                 # edit: add `changes` job, gate jobs
    └── main.yml                   # edit: add `changes` job, gate jobs
.specify/memory/constitution.md    # edit: PATCH note on spec-only exemption
```

**Structure Decision**: CI-only change under `.github/`. A reusable workflow keeps one classification implementation, so future workflows opt in with a single `uses:` job plus `needs`/`if` (FR-004).

## Complexity Tracking

No constitution violations.

# Implementation Plan: Spec Form Page and Spec Issue Filing

**Branch**: `010-spec-github-issues` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-spec-github-issues/spec.md` plus the plan input describing the spec form fields and issue format.

## Summary

Add a single-page spec form to the "Create feature spec" scaffolder template. Each new workflow run creates a new GitHub issue before `/speckit-specify` runs; retries within that run reuse its issue, while a later run creates another issue. Issue title, label, and body are populated from the form. Filing uses a new scaffolder action, `x_github:issue:create`, in the existing `scaffolder-backend-module-github` plugin, which already creates Octokit clients from the user's token. The form and issue-body assembly live in the template (`ServerlessOpsIO/backstage-github-speckit-feature`, `template-spec.yaml`, registered in `app-config.production.yaml`); this repo owns the action and the contract. The workflow exposes the issue number and URL for PR authors, but adding a non-closing PR reference is best effort.

## Technical Context

**Language/Version**: TypeScript (Backstage backend plugin, existing toolchain in `src/`)

**Primary Dependencies**: `@backstage/plugin-scaffolder-node` (`createTemplateAction`), Octokit via existing `createUserOctokit` in `src/plugins/scaffolder-backend-module-github/src/actions/common.ts`

**Storage**: N/A (the GitHub issue is the record)

**Testing**: Jest through `backstage-cli package test`, mirroring `pr-comment.test.ts`

**Target Platform**: Backstage backend (ECS/Fargate production, local dev)

**Project Type**: Backstage backend module plus scaffolder template YAML (external repo)

**Performance Goals**: Issue creation uses one create request; retry detection may search for the run marker before creating.

**Constraints**: Acts as the signed-in user (`requestUserCredentials`), no tokens in tracked files; creates one issue per workflow run and remains idempotent on retries within that run (spec FR-003); issue must not close automatically (spec FR-008); PR references are best effort (FR-007)

**Scale/Scope**: One new action file, its test, registration, README entry, one template page

## Constitution Check

| Principle | Status |
|---|---|
| I. Architecture Boundaries | Pass: reusable behavior goes in `src/plugins/scaffolder-backend-module-github`, registered through its module; no code in `packages/app` or `packages/backend` |
| II. Catalog Integrity | Pass: scaffolder action defines failure behavior (throws with a clear message, no partial state) and repeat behavior (run-scoped idempotency; distinct runs create distinct issues; see research D4) |
| III. Environment-Driven Configuration | Pass: no new config keys; uses existing GitHub host/user token. Template registration already exists in `app-config.production.yaml` |
| IV. Secrets and Least Privilege | Pass: user's token via task secret, not stored; fails safely if the secret is missing or the user lacks issue permission |
| V. Validation and Deployment Integrity | Pass, gated: `yarn tsc:full`, `yarn build:all`, `yarn test:all`, `yarn lint:all`; unit tests added for the action. No new dependencies; no infra change |

Post-design re-check: no violations, Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/010-spec-github-issues/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── spec-form.md
    └── issue-create-action.md
```

### Source Code (repository root)

```text
src/plugins/scaffolder-backend-module-github/
├── README.md                       # document x_github:issue:create
└── src/
    ├── module.ts                   # register the new action
    └── actions/
        ├── index.ts                # export issue-create
        ├── issue-create.ts         # new action
        └── issue-create.test.ts    # new tests

# External repo ServerlessOpsIO/backstage-github-speckit-feature
template-spec.yaml                  # spec form page + issue step (per contracts/spec-form.md)
```

**Structure Decision**: Extend the existing GitHub scaffolder module with one action. The form is template YAML in the external template repo, specified here as a contract so both sides stay in sync.

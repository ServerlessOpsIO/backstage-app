# Implementation Plan: Event-Driven Catalog Updates

**Branch**: `plan/010-catalog-event-updates` | **Date**: 2026-11-08 | **Spec**: `specs/010-catalog-event-updates/spec.md`

**Input**: Feature specification from `specs/010-catalog-event-updates/spec.md` plus implementation direction to use `@backstage/plugin-events-backend-module-aws-sqs` with a FIFO queue and GitHub-style event-driven provider behavior.

## Summary

Add event-driven catalog updates for the ServerlessOps catalog provider by wiring Backstage Events + AWS SQS consumption (`@backstage/plugin-events-backend-module-aws-sqs`) and extending the existing provider to apply create/update/delete notifications in FIFO delivery order. Keep scheduled polling as fallback (at a lower frequency), and model behavior after the GitHub events pattern (event topic subscription + provider-specific handling), but sourced from SQS instead of webhooks.

## Technical Context

**Language/Version**: TypeScript 5.8, Node.js 24.x

**Primary Dependencies**:
- Existing: `@backstage/plugin-catalog-node`, `@backstage/backend-plugin-api`, `@backstage/config`, `axios`
- New (feature): `@backstage/plugin-events-backend`, `@backstage/plugin-events-node`, `@backstage/plugin-events-backend-module-aws-sqs`
- Existing reference pattern: `@backstage/plugin-events-backend-module-github`

**Storage**:
- AWS SQS FIFO queue for inbound catalog change notifications
- AWS SQS dead-letter queue (redrive target for exhausted retries)
- Backstage catalog persistence (existing DB backend)

**Testing**: Jest via Backstage package tests (`yarn --cwd src workspace @internal/backstage-plugin-catalog-backend-module-serverlessops-catalog test`), plus repo-level TypeScript/lint/build gates as needed

**Target Platform**: Backstage backend service (`src/packages/backend`) in local development and AWS ECS/Fargate production deployment

**Project Type**: Backstage monorepo backend module enhancement

**Performance Goals**:
- Meet spec targets: 95% of valid create/update/delete changes reflected within 60s
- Maintain 99% successful processing over rolling 7 days
- Reduce fallback polling volume by >=80% from baseline

**Constraints**:
- Must apply snapshots in FIFO queue delivery order
- Must support bounded retries and DLQ handoff for failures
- Must preserve fallback scheduled sync path
- Must enforce least-privilege queue access controls
- Must scope changes to ServerlessOps provider only

**Scale/Scope**:
- Provider entity kinds currently include Domain, System, Resource, Users, Group
- Scope limited to `@internal/backstage-plugin-catalog-backend-module-serverlessops-catalog`, backend module wiring, and Backstage config

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review

- **I. Architecture Boundaries**: PASS — changes stay within `src/plugins/...serverlessops-catalog`, `src/packages/backend`, and config files.
- **II. Catalog Integrity**: PASS — plan defines idempotent event handling, deterministic ordering, and fallback polling.
- **III. Environment-Driven Configuration**: PASS — event/SQS settings are config-driven in `app-config*.yaml` and env vars.
- **IV. Secrets and Least Privilege**: PASS — no secrets committed; IAM queue policies remain externalized and least-privilege.
- **V. Validation and Deployment Integrity**: PASS — targeted plugin tests and repo validation commands identified.

### Post-Phase 1 Design Re-Check

- **I. Architecture Boundaries**: PASS — contracts and model map only to existing backend/provider boundaries.
- **II. Catalog Integrity**: PASS — data model and contracts specify idempotency, FIFO ordering, and failure outcomes.
- **III. Environment-Driven Configuration**: PASS — contract captures configuration surfaces without embedding environment secrets.
- **IV. Secrets and Least Privilege**: PASS — design requires restricted queue publish/consume principals.
- **V. Validation and Deployment Integrity**: PASS — quickstart defines executable validation flows and expected outcomes.

## Project Structure

### Documentation (this feature)

```text
specs/010-catalog-event-updates/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── catalog-entity-change-notification.schema.json
│   └── event-topic-contract.md
└── tasks.md               # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app-config.production.yaml
├── app-config.yaml
├── packages/
│   └── backend/
│       ├── package.json
│       └── src/index.ts
└── plugins/
    └── catalog-backend-module-serverlessops-catalog/
        ├── package.json
        └── src/
            ├── index.ts
            ├── module.ts
            ├── provider/
            │   ├── ServerlessOpsCatalogProvider.ts
            │   └── ServerlessOpsCatalogProvider.test.ts
            └── util/jwt.ts
```

**Structure Decision**: Use the existing Backstage backend composition model and extend the current ServerlessOps catalog backend module in place. Do not introduce new plugins; add event-consumption wiring and provider event handling inside existing module boundaries.

## Complexity Tracking

No constitution violations requiring justification in this planning phase.

<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- template principle 1 -> I. Architecture Boundaries
- template principle 2 -> II. Catalog Integrity
- template principle 3 -> III. Environment-Driven Configuration
- template principle 4 -> IV. Secrets and Least Privilege
- template principle 5 -> V. Validation and Deployment Integrity
Added sections:
- Operational Guardrails
- Delivery Workflow
Removed sections:
- None
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
- ⚠ pending: .specify/templates/commands/*.md (directory not present)
Follow-up TODOs:
- None
-->

# Backstage App Constitution

## Core Principles

### I. Architecture Boundaries
The application source of truth for Backstage code MUST live under `src/`, while
the repository root owns AWS SAM, container, and ECS deployment assets. New
frontend behavior MUST be implemented in `src/packages/app` or a dedicated
frontend plugin. New backend behavior MUST be implemented as a backend module or
plugin and registered through the backend composition layer. Reusable
ServerlessOps behavior MUST live in workspace packages under `src/plugins/*`,
not as ad hoc code in `src/packages/app` or `src/packages/backend` except where
composition requires it. Backstage extension points and composition APIs MUST be
preferred over framework patching or one-off overrides. Rationale: package and
plugin boundaries preserve upgradeability, isolate ownership, and keep the
application compatible with both local development and production deployment.

### II. Catalog Integrity
The software catalog is a first-class product surface. Changes to catalog
ingestion, entity providers, scaffolder actions, or template registration MUST
preserve stable behavior, clear ownership metadata, and idempotent outcomes.
Changes that affect entity ingestion or scaffolder flows MUST define how failure,
retry, and repeat execution behave. Rationale: catalog and scaffolder regressions
directly degrade portal trust and can create duplicate or inconsistent entities
if change behavior is not deterministic.

### III. Environment-Driven Configuration
Environment-specific behavior MUST be expressed through `app-config*.yaml`,
environment variables, or git-ignored credential include files. `app-config.yaml`
defines global defaults; `app-config.production.yaml` defines Amazon deployed
runtime behavior; `app-config.local.yaml` defines local development behavior; and
`app-config.home.yaml` defines home deployment behavior. New configuration keys
MUST be wired for both local and production usage, with explicit defaults or
explicit failure behavior. Changes to auth providers, integrations, catalog
providers, or external endpoints MUST document their runtime configuration source.
Root infrastructure changes and `src/` application changes MUST maintain a
coherent runtime contract. Rationale: explicit configuration ownership prevents
environment drift and keeps deployment behavior reviewable.

### IV. Secrets and Least Privilege
Secrets MUST NOT be committed in tracked config, templates, examples, fixtures,
or documentation. Local credentials MUST live only in ignored files or
developer-specific secret stores. CI and deployment credentials MUST be injected
at build or deploy time. Existing tracked secret-like material MUST be treated as
debt to remove, not precedent to repeat. External integrations MUST use least
privilege and MUST fail safely when credentials or required permissions are
missing. Rationale: this repository governs both application and deployment
surfaces, so credential leakage or overbroad access has immediate production
impact.

### V. Validation and Deployment Integrity
A change is not complete unless it passes the repository's required validations.
Infrastructure changes MUST pass `sam validate --lint` and
`sam build --parallel --template template.yaml` from the repository root.
Application changes under `src/` MUST pass `yarn tsc:full`, `yarn build:all`,
`yarn test:all`, and `yarn lint:all`. New behavior MUST include the narrowest
useful automated test, and changed behavior MUST update affected tests. User-
critical UI, sign-in, routing, scaffolder, and catalog flows SHOULD add or
update end-to-end coverage when materially affected. Changes that add or modify
dependencies MUST update the relevant lock files and pass dependency integrity
checks. Production delivery is defined by the SAM template, the ECS/Fargate
runtime, and the container build pipeline; infrastructure and application changes
MUST remain compatible with SAM validation and build, container image build, ECS
runtime assumptions, and PostgreSQL-backed production operation. Rationale:
passing the deploy path is part of correctness for this repository, not a later
operational concern.

## Operational Guardrails

Production-safe defaults are mandatory. Local-only conveniences such as guest
auth, permissive policies, and relaxed integrations MUST remain explicitly scoped
to local development. Production changes MUST preserve deliberate network, TLS,
database, and auth assumptions. Outbound access, proxy behavior, and catalog
reads MUST be intentionally allowlisted rather than implicitly open.
Configuration or code that weakens production security requires explicit review
and justification.

Generated artifacts such as `coverage`, `dist`, `dist-types`, caches, and
`node_modules` MUST NOT be treated as authored source of truth. Reviewable assets
are source, configuration, templates, tests, and documentation. Build and
container outputs MUST be reproducible from the declared toolchain and workspace
state.

User-visible workflow changes MUST update relevant template metadata, README
content, or configuration guidance in the same change. Operationally significant
changes MUST document required environment variables, external dependencies,
schedules, and failure expectations.

Repository conventions are enforceable: TypeScript and JavaScript files MUST NOT
use trailing semicolons; TypeScript and JavaScript files MUST use 4-space
indentation; React TypeScript and React JavaScript files MUST use 2-space
indentation; existing indentation in a file MUST be respected when editing;
Jest tests MUST use `test()` rather than `it()`; fetch mocking in Jest MUST use
`jest-fetch-mock`; and new code MUST follow existing package boundaries and
naming patterns rather than introducing parallel conventions.

## Delivery Workflow

Before merge, every change MUST confirm that architecture follows package and
plugin boundaries, configuration and secrets follow the environment-driven model,
required validation commands pass in the correct working directories, and docs or
config examples are updated for new environment variables, routes, providers,
templates, or auth requirements. Changes affecting SAM, Docker, runtime ports,
health behavior, or ECS assumptions MUST include explicit deployment impact
review.

If an intentional change alters architecture, security posture, delivery
workflow, or required quality gates, this constitution MUST be updated in the
same change. Team conventions MUST NOT remain implicit once they become material
to delivery governance.

## Governance

This constitution supersedes conflicting local conventions for the Backstage App
repository. Compliance review MUST occur in every feature plan, task breakdown,
implementation review, and merge review that changes application behavior,
infrastructure behavior, or deployment configuration.

Amendments MUST be made in the same change that introduces the new governing rule
or exception. Every amendment MUST include: the updated constitutional text,
dependent template updates when applicable, and a concise rationale in the Sync
Impact Report at the top of this file.

Versioning policy for this constitution follows semantic versioning. MAJOR
versions indicate backward-incompatible governance changes or principle removal.
MINOR versions indicate new principles, new sections, or materially expanded
governance. PATCH versions indicate clarifications that do not change meaning or
enforcement. Because this is the first concrete adoption of the constitution from
an unfilled template, this document is ratified as version `1.0.0`.

**Version**: 1.0.0 | **Ratified**: 2026-06-30 | **Last Amended**: 2026-06-30

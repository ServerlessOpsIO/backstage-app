# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript with the Backstage Yarn workspace under `src/`; root infrastructure defined in AWS SAM templates and container build assets

**Primary Dependencies**: Backstage plugins/modules, Yarn workspaces, AWS SAM, container image build pipeline, PostgreSQL-backed production runtime

**Storage**: PostgreSQL in production; catalog, provider, and integration state as defined by Backstage services and configured dependencies

**Testing**: `sam validate --lint` and `sam build --parallel --template template.yaml` at repo root; `yarn tsc:full`, `yarn build:all`, `yarn test:all`, and `yarn lint:all` from `src/`; feature-specific automated tests for changed behavior

**Target Platform**: Local Backstage development plus Amazon-deployed ECS/Fargate runtime managed by the repository root

**Project Type**: Backstage application monorepo under `src/` with root-owned infrastructure and deployment assets

**Performance Goals**: Preserve stable catalog, scaffolder, sign-in, routing, and production deployment behavior for the affected surface

**Constraints**: Respect plugin/package boundaries, environment-driven configuration, secret handling rules, ECS runtime assumptions, and reproducible build outputs

**Scale/Scope**: Feature scope MUST identify whether it changes repo-root deployment assets, `src/` application code, or both, and define the runtime contract between them

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Changes MUST keep application source of truth in `src/` and deployment source of truth at the repository root.
- Frontend work MUST land in `src/packages/app` or a dedicated frontend plugin; backend work MUST land in backend modules/plugins wired through composition; reusable ServerlessOps behavior MUST live under `src/plugins/*`.
- The plan MUST identify configuration changes across `app-config.yaml`, `app-config.local.yaml`, `app-config.production.yaml`, and `app-config.home.yaml`, plus any required environment variables or git-ignored credential files.
- The plan MUST state how secrets are avoided in tracked files and how least-privilege external access is preserved.
- The plan MUST list the required validation commands by scope: root `sam validate --lint` and `sam build --parallel --template template.yaml`; `src/` `yarn tsc:full`, `yarn build:all`, `yarn test:all`, and `yarn lint:all`.
- If catalog ingestion, entity providers, scaffolder actions, auth providers, integrations, routes, Docker behavior, ports, health checks, or ECS assumptions change, the plan MUST capture deployment and operational impact.
- User-visible workflow changes MUST include same-change documentation updates.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
template.yaml
src/
├── app-config.yaml
├── app-config.local.yaml
├── app-config.production.yaml
├── app-config.home.yaml
├── packages/
│   ├── app/
│   └── backend/
└── plugins/

# Add feature-specific test and package paths based on the selected plugin/module
# structure above. Root-level infrastructure artifacts and `src/` application
# assets must both be listed when a feature spans both surfaces.
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

# Implementation Plan: Homepage Useful Information Hub

**Branch**: `[005-homepage-info-hub]` | **Date**: 2026-10-28 | **Spec**: `/specs/005-homepage-info-hub/spec.md`

**Input**: Feature specification from `/specs/005-homepage-info-hub/spec.md`

## Summary

Deliver a homepage information hub by reusing existing Backstage Home components for search/toolkit baseline behavior, and adding a dedicated home plugin module for new personalized widgets (GitHub opened issues, assigned issues, opened PRs, review-requested PRs, and today's primary Google Calendar events). The plan keeps configuration-driven layout in `app-config*.yaml`, updates toolkit links, and produces two screenshot-ready layout variants before final arrangement is chosen.

## Technical Context

**Language/Version**: TypeScript 5.8, React 18, Node.js 24 runtime in Backstage monorepo

**Primary Dependencies**:
- Existing: `@backstage/plugin-home`, `@backstage/plugin-home-react`, `@backstage/core-plugin-api`, `@backstage/frontend-plugin-api`
- New module package: `@internal/backstage-plugin-home-module-info-hub` (Backstage naming standard)
- Vendor SDK/API usage: `@octokit/rest` for GitHub user work queries; Google Calendar v3 REST API with user OAuth token from Backstage Google auth API

**Storage**: N/A (read-only aggregation of external user-scoped APIs; transient client-side state only)

**Testing**: Jest + React Testing Library (unit/widget states), optional Playwright for homepage variant screenshot flow, existing `yarn tsc:full`, `yarn lint:all`, `yarn test:all`

**Target Platform**: Backstage web frontend (`src/packages/app`) running in modern browsers

**Project Type**: Backstage web application (frontend app plus workspace plugins/modules)

**Performance Goals**:
- Homepage shell and static widgets render immediately (no blocking on external APIs)
- Personalized widgets show loading states within first paint and resolve within normal interactive latency (<5s on standard corporate network)

**Constraints**:
- Preserve search bar at top and required toolkit/world-clock visibility in all layouts
- Use each signed-in user's linked GitHub and Google authorization
- Show explicit unavailable/no-data states per widget (no cascading failure)
- Keep secrets in environment config only; no committed credentials

**Scale/Scope**:
- One homepage route (`/`)
- Required widgets: search, toolkit, world clock, 4 GitHub work widgets, 1 Google Calendar widget
- At least 2 layout variants captured as screenshots/mockups

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Architecture Boundaries — PASS**: New feature code stays in `src/plugins/*` (new home module plugin); `src/packages/app` only composes the module.
- **III. Environment-Driven Configuration — PASS**: Homepage layout and link changes remain configuration-driven in `app-config.yaml` and environment overlays (`app-config.production.yaml`, `app-config.home.yaml` as needed for provider readiness).
- **IV. Secrets and Least Privilege — PASS**: OAuth secrets remain environment variables; no hardcoded tokens. Access scopes limited to GitHub user read and Google Calendar read.
- **V. Validation and Deployment Integrity — PASS**: Plan includes repo-standard typecheck, lint, tests, and focused homepage verification.

**Post-Design Re-check**: PASS. Phase 1 artifacts keep plugin boundaries, config ownership, and explicit degraded-state behavior without constitutional violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-homepage-info-hub/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── homepage-info-hub-ui-contracts.md
└── tasks.md               # created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app-config.yaml
├── app-config.home.yaml
├── app-config.production.yaml
├── packages/
│   └── app/
│       └── src/
│           ├── App.tsx
│           └── modules/
│               └── home/
│                   └── homeModule.tsx
└── plugins/
    └── home-module-info-hub/              # new plugin module package
        ├── package.json
        └── src/
            ├── index.ts
            ├── module.tsx
            ├── api/
            │   ├── github-work-client.ts
            │   └── google-calendar-client.ts
            ├── components/
            │   ├── github-work-widget.tsx
            │   ├── google-calendar-widget.tsx
            │   └── widget-state-panel.tsx
            └── __tests__/
                ├── github-work-widget.test.tsx
                └── google-calendar-widget.test.tsx
```

**Structure Decision**: Use a dedicated Backstage frontend plugin module (`home-module-info-hub`) for all new homepage widget behavior, while preserving existing `home` page composition and config-first layout wiring in app config files.

## Complexity Tracking

No constitution violations requiring justification.

# Quickstart: Validate the My Services Widget

## Prerequisites

- Node and Yarn per `src/package.json`; dependencies installed with `yarn install` in `src/`.
- A local catalog with test data. Add a temporary location (do not commit) containing:
  - User `jdoe`, a member of group `team-a`; group `team-b` without `jdoe`.
  - `svc-direct` (Component, `type: service`, `owner: user:jdoe`, `lifecycle: production`).
  - `svc-team` (Component, `type: service`, `owner: group:team-a`, no lifecycle).
  - `svc-other` (Component, `type: service`, `owner: group:team-b`).
  - `web-team` (Component, `type: website`, `owner: group:team-a`).
  - 11 more services owned by `group:team-a` for the paging check.
- Sign in with an identity that resolves to `user:default/jdoe` (see `app-config.local.yaml`).

## Automated checks (from `src/`)

```bash
yarn workspace @internal/backstage-plugin-home-module-info-hub test --watchAll=false
yarn tsc:full
yarn lint:all
yarn test:all
yarn build:all
```

Expected: all pass. The new `my-services-widget.test.tsx` covers the scenarios below with stubbed APIs.

## Manual scenarios (`yarn start` in `src/`, open `/`)

| # | Scenario (spec ref) | Expected |
|---|---------------------|----------|
| 1 | Direct ownership (US1-1) | `svc-direct` listed |
| 2 | Group ownership (US1-2) | `svc-team` listed |
| 3 | Unowned excluded (US1-3) | `svc-other` and `web-team` absent |
| 4 | Link (US1-4) | Clicking `svc-direct` opens its catalog page |
| 5 | Owner and lifecycle (US2) | `svc-team` shows owner `team-a` and a blank lifecycle; `svc-direct` shows `production` |
| 6 | Paging (US3-1) | 13 services: page 1 shows 10 sorted alphabetically, page 2 shows 3 |
| 7 | View all (US3-2) | Opens the catalog with Owned + service filters showing the same 13 |
| 8 | Empty (edge) | Guest sign-in shows "You don't own any services yet." |
| 9 | Unavailable (edge) | Stop the backend catalog (or block `/api/catalog` in devtools): the widget shows the unavailable message, and the other widgets still render |
| 10 | Layout (FR-013) | Restore the default layout: My Services sits above Opened Issues, and every 005 widget is present |

Remove the temporary catalog location after validation.

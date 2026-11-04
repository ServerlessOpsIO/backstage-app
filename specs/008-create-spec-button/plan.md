# Implementation Plan: Create Spec Button on Component Specs Page

**Branch**: `008-create-spec-button` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-create-spec-button/spec.md`

## Summary

Add a "Create spec" button to the upper right of the existing component Specs tab (`SpecsCatalogEntityContent`). The button links to the scaffolder template "Create feature spec" (`template:default/1-speckit-feature`, registered from [`template-spec.yaml`](https://github.com/ServerlessOpsIO/backstage-github-speckit-feature/blob/main/template-spec.yaml)) with the originating component pre-filled through the scaffolder's `formData` query parameter. Availability (template exists in catalog) and permission (scaffolder permissions) are checked with existing Backstage APIs; when either fails the button is disabled with a visible explanation. Only stock Backstage UI components are used (`ContentHeader` from `@backstage/core-components`, `Button`/`Text` from `@backstage/ui`); no custom widgets.

## Technical Context

**Language/Version**: TypeScript, React 18 (Backstage new frontend system)

**Primary Dependencies**: `@backstage/core-components`, `@backstage/ui`, `@backstage/plugin-catalog-react`, `@backstage/plugin-scaffolder` (route), `@backstage/plugin-scaffolder-common` (permissions), `@backstage/plugin-permission-react` (`usePermission`), `@backstage/frontend-plugin-api`. New deps for the plugin's `package.json`: `@backstage/plugin-scaffolder`, `@backstage/plugin-scaffolder-common`, `@backstage/plugin-permission-react`.

**Storage**: N/A

**Testing**: Jest via `backstage-cli package test` (`test()` not `it()`, `jest-fetch-mock` for fetch); Playwright e2e in `src/packages/app/e2e-tests`

**Target Platform**: Backstage web app (browser), existing ECS deployment

**Project Type**: Web application (Backstage frontend plugin module)

**Constraints**: Button visible during specs loading and error states (FR-008); no new permissions or config; template ref defined in one constant

**Scale/Scope**: One component changed, three small files added, tests

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Architecture Boundaries | PASS | Lives in `src/plugins/catalog-module-serverlessops`, extending existing Specs content; no app/backend patching |
| II. Catalog Integrity | PASS | Read-only catalog lookup of the template; no ingestion/scaffolder changes |
| III. Environment-Driven Configuration | PASS | Template already registered in `app-config.production.yaml`; no new config keys. Local config lacks the template, so local shows the "unavailable" state unless registered (documented in quickstart) |
| IV. Secrets and Least Privilege | PASS | No secrets; reuses existing permissions; fails safe (disabled) |
| V. Validation | PASS (gate for implementation) | Run `yarn tsc:full`, `yarn build:all`, `yarn test:all`, `yarn lint:all`; update `yarn.lock` for new deps; no semicolons, 2-space React indent, `test()` |

Post-design re-check: PASS. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/008-create-spec-button/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── create-spec-button.md
└── tasks.md             # Created by /speckit-tasks
```

### Source Code (repository root)

```text
src/plugins/catalog-module-serverlessops/
├── package.json                                   # add scaffolder/permission deps
└── src/components/CatalogEntityContent/
    ├── SpecsCatalogEntityContent.tsx              # ContentHeader + button always rendered; body swaps on loading/error
    ├── SpecsCatalogEntityContent.test.tsx         # new
    ├── CreateSpecButton.tsx                       # new: button + disabled explanation
    ├── CreateSpecButton.test.tsx                  # new
    └── useCreateSpecAvailability.ts               # new: template lookup + permission checks

src/packages/app/e2e-tests/app.test.ts             # extend: Specs tab shows Create spec and navigates
```

**Structure Decision**: Extend the existing frontend plugin module per Principle I. The current component returns early on `loading`/`error`; restructure so the header renders in all states.

## Complexity Tracking

No constitution violations.

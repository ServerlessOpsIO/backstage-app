# Implementation Plan: My Services Homepage Widget

**Branch**: `plan/006-my-services-widget` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-my-services-widget/spec.md`

## Summary

Add a "My Services" card to the Backstage homepage. It lists catalog components of type `service` owned by the signed-in user or by groups they are a direct member of, with owner, lifecycle, paging and a "View all" link to the catalog's Owned filter.

The widget is a new extension in the existing `@internal/backstage-plugin-home-module-info-hub` frontend module. It reads ownership refs from the signed-in identity and queries the existing catalog API directly, so **no backend code and no new backend plugin are required** (research Decisions 1–3).

## Technical Context

**Language/Version**: TypeScript ~5.8, React 18, Node v24.16.0 (Backstage 1.54.6, new frontend system)

**Primary Dependencies**: `@backstage/plugin-home-react` (`HomePageWidgetBlueprint`), `@backstage/core-components` (`InfoCard`, `Table`, `Link`), `@backstage/core-plugin-api` (`identityApiRef`), and `@backstage/plugin-catalog-react` (`catalogApiRef`, `EntityRefLink`; **new dependency for this module**)

**Storage**: N/A (reads the existing catalog; nothing persisted)

**Testing**: Jest via `backstage-cli package test`, `@testing-library/react`, `@backstage/frontend-test-utils` / `TestApiProvider`

**Target Platform**: Backstage web app (browser), served by the existing ECS/Fargate deployment

**Project Type**: Web application, as a frontend plugin module in a Backstage monorepo

**Performance Goals**: Widget content visible within 3 s of homepage load (SC-004). One projected catalog request per load.

**Constraints**: Read-only. Respects the catalog permission policy (FR-012). A failure stays inside the widget (FR-011). No new credentials or config keys.

**Scale/Scope**: Tens to low hundreds of services per user. One new widget, one layout change, one module README update.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|------------|--------|
| I. Architecture Boundaries | Code lives in the existing workspace module `src/plugins/home-module-info-hub`, registered through `HomePageWidgetBlueprint`. Only `app-config.yaml` layout changes outside it. No backend code needed; if any becomes needed, it goes in a separate backend plugin. | ✅ Pass |
| II. Catalog Integrity | Read-only catalog queries; no ingestion, provider or scaffolder changes. | ✅ Pass |
| III. Environment-Driven Configuration | Only `page:home` `defaultConfig` in global `app-config.yaml` changes, which applies to every environment. No new keys or env vars. | ✅ Pass |
| IV. Secrets and Least Privilege | No secrets. Uses the user's own token through the existing catalog API, so results are filtered by the permission policy. | ✅ Pass |
| V. Validation and Deployment Integrity | Colocated Jest tests added; `yarn tsc:full`, `build:all`, `test:all`, `lint:all` required. The new dependency updates `yarn.lock`. No SAM/infra change. | ✅ Pass |
| Guardrails: conventions | New `.tsx` files use 2-space indentation and `test()`. The existing module files use trailing semicolons; edits to existing files keep each file's style, and new files follow the module's established style for consistency (see Complexity Tracking). | ⚠️ Noted |
| Guardrails: docs | Module README gains a "My Services" section, including the saved-layout caveat. | ✅ Pass |

**Post-design re-check (after Phase 1)**: No change. The design adds no backend, config keys or dependencies beyond `@backstage/plugin-catalog-react` (already used by sibling workspace plugins). Gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/006-my-services-widget/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── my-services-widget-contract.md
├── checklists/requirements.md
├── catalog-info.yaml
└── tasks.md             # Phase 2 output (/speckit-tasks; not created here)
```

### Source Code (repository root)

```text
src/
├── app-config.yaml                                   # add HomePageMyServices to page:home defaultConfig; shift GitHub rows, extend calendar
└── plugins/home-module-info-hub/
    ├── package.json                                  # + @backstage/plugin-catalog-react
    ├── README.md                                     # + My Services section
    └── src/
        ├── module.tsx                                # + myServicesWidget extension
        ├── models/my-services.ts                     # MyService type, toMyService(), sortByDisplayName()
        └── components/
            ├── my-services-widget.tsx                # Widget + Renderer
            └── my-services-widget.test.tsx           # Colocated tests
```

**Structure Decision**: Extend the existing frontend module `src/plugins/home-module-info-hub`, as directed. There are no backend changes, so no `*-backend` plugin is created.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New files keep the module's trailing-semicolon style, not the constitution's no-semicolon rule | Every existing file in `home-module-info-hub` uses semicolons, and the constitution says to respect existing file conventions. A mixed style in one module hurts readability. | Reformatting the whole module is out of scope for this feature. A follow-up can bring the module into line with the constitution in one change. |

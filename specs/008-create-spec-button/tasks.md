---

description: "Task list for Create Spec Button on Component Specs Page"
---

# Tasks: Create Spec Button on Component Specs Page

**Input**: Design documents from `/specs/008-create-spec-button/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/create-spec-button.md, quickstart.md

**Tests**: Included, as called for by plan.md (Jest via `backstage-cli package test`, Playwright e2e). Use `test()` not `it()`.

**Organization**: Grouped by user story. Plugin root: `src/plugins/catalog-module-serverlessops/` (abbrev. `PLUGIN`). Component dir: `PLUGIN/src/components/CatalogEntityContent/` (abbrev. `CEC`). Code style: no semicolons, 2-space React indent.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

**Purpose**: Dependencies

- [X] T001 Add `@backstage/plugin-scaffolder`, `@backstage/plugin-scaffolder-common`, and `@backstage/plugin-permission-react` to dependencies in `src/plugins/catalog-module-serverlessops/package.json` (match versions used in `src/packages/app/package.json`), then run `yarn install` in `src/` to update `src/yarn.lock`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared constant and availability logic used by both stories

**⚠️ CRITICAL**: Complete before user stories

- [X] T002 Define a single exported constant for the template ref `template:default/1-speckit-feature` (plus template name/namespace helpers for the route path `templates/default/1-speckit-feature`) in `src/plugins/catalog-module-serverlessops/src/components/CatalogEntityContent/useCreateSpecAvailability.ts`
- [X] T003 Implement `useCreateSpecAvailability` hook in `src/plugins/catalog-module-serverlessops/src/components/CatalogEntityContent/useCreateSpecAvailability.ts` returning `{ state: 'checking' | 'available' | 'unavailable' | 'forbidden', reason?: string }`: `catalogApi.getEntityByRef(templateRef)` via `useAsync` (null or error → `unavailable`, reason "The Create feature spec workflow is unavailable."); `usePermission` for `taskCreatePermission` and `templateParameterReadPermission` (resource ref = template ref); either denied → `forbidden` (reason "You don't have permission to start the Create feature spec workflow."); pending → `checking`; independent of specs list loading/error state (depends on T002)

**Checkpoint**: Hook ready

---

## Phase 3: User Story 1 - Start spec creation from the specs page (Priority: P1) 🎯 MVP

**Goal**: "Create spec" button in the upper right of the Specs tab that opens the "Create feature spec" workflow, with disabled+explanation states, visible in all specs states.

**Independent Test**: Open a component's Specs tab; the button shows upper right (with/without specs, during loading/error); click navigates to `/create/templates/default/1-speckit-feature`; missing template or denied permission shows a disabled button with visible explanation.

### Tests for User Story 1

- [ ] T004 [P] [US1] Unit tests for `CreateSpecButton` in `src/plugins/catalog-module-serverlessops/src/components/CatalogEntityContent/CreateSpecButton.test.tsx`: enabled when available and navigates to the scaffolder template route; disabled with no text when checking; disabled with unavailable explanation; disabled with permission explanation; explanation linked via `aria-describedby`
- [ ] T005 [P] [US1] Unit tests for `SpecsCatalogEntityContent` in `src/plugins/catalog-module-serverlessops/src/components/CatalogEntityContent/SpecsCatalogEntityContent.test.tsx`: button rendered (enabled when available) in loading, error, empty, and populated states
- [ ] T006 [P] [US1] Extend Playwright e2e in `src/packages/app/e2e-tests/app.test.ts`: Specs tab shows "Create spec" at the upper right and clicking it lands on the "Create feature spec" workflow start

### Implementation for User Story 1

- [ ] T007 [US1] Create `CreateSpecButton` in `src/plugins/catalog-module-serverlessops/src/components/CatalogEntityContent/CreateSpecButton.tsx` using `Button`/`Text` from `@backstage/ui` and the scaffolder root route (`useRouteRef(rootRouteRef)` from `@backstage/plugin-scaffolder`) to link to `<root>/templates/default/1-speckit-feature`; use `useCreateSpecAvailability`; disabled unless `available`; render the reason as visible `Text` linked by `aria-describedby` for `unavailable`/`forbidden` (per contracts/create-spec-button.md) (depends on T003)
- [ ] T008 [US1] Restructure `src/plugins/catalog-module-serverlessops/src/components/CatalogEntityContent/SpecsCatalogEntityContent.tsx`: always render `ContentHeader` from `@backstage/core-components` with `CreateSpecButton` in its action slot (upper right, wraps on narrow screens); swap only the body between `Progress`, `ResponseErrorPanel`, and the table instead of returning early (depends on T007)
- [ ] T009 [US1] Verify the scaffolder route ref is resolvable from the plugin module (new frontend system external route binding); add the binding in `src/packages/app` only if required, and confirm the link resolves to `/create/templates/default/1-speckit-feature`

**Checkpoint**: US1 functional and testable independently

---

## Phase 4: User Story 2 - Workflow is pre-associated with the component (Priority: P3)

**Goal**: Originating component pre-selected (and editable) in the workflow.

**Independent Test**: Click "Create spec"; the workflow form shows the component pre-filled and it can be changed.

### Tests for User Story 2

- [ ] T010 [P] [US2] Add tests in `src/plugins/catalog-module-serverlessops/src/components/CatalogEntityContent/CreateSpecButton.test.tsx` asserting the link contains `?formData=` URL-encoded JSON with `component` (entity ref, required) and optional `system`, `owner`, `domain` from the entity; omitted when absent

### Implementation for User Story 2

- [ ] T011 [US2] In `src/plugins/catalog-module-serverlessops/src/components/CatalogEntityContent/CreateSpecButton.tsx`, build the `formData` query from `useEntity()`: `component` = `stringifyEntityRef(entity)`; `system` from `spec.system`, `owner` from `spec.owner`, `domain` from the system's `partOf` domain when available (catalog lookup, non-blocking); URL-encode the JSON (depends on T007)
- [ ] T012 [US2] Manually verify in a running app (`cd src && yarn start`, template registered) that the `SoContextualEntityPicker` accepts the prefilled values and the field stays editable; if not, reduce prefill to `component` only and update T010 tests accordingly

**Checkpoint**: Both stories work

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T013 Update `specs/008-create-spec-button/quickstart.md` if behavior diverged during implementation (e.g. reduced prefill)
- [ ] T014 Run validation from `src/`: `yarn tsc:full`, `yarn lint:all`, `yarn test:all`, `yarn build:all`; fix any failures
- [ ] T015 Run the quickstart.md manual checks (upper right placement, narrow viewport, unavailable, forbidden, specs lookup failure keeps button enabled)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 (Phase 3) → US2 (Phase 4) → Polish
- US2 modifies `CreateSpecButton.tsx` created in US1 (T011 depends on T007)
- Within stories: tests may be written first (should fail), then implementation; T007 → T008

### Parallel Opportunities

- T004, T005, T006 can run in parallel (different files)
- T010 is in the same file as T004; run after T004

## Parallel Example: User Story 1

```text
Task: "Unit tests for CreateSpecButton in CreateSpecButton.test.tsx"
Task: "Unit tests for SpecsCatalogEntityContent in SpecsCatalogEntityContent.test.tsx"
Task: "Extend Playwright e2e in src/packages/app/e2e-tests/app.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001 → T003 → T007–T009, with tests T004–T006
2. Stop and validate: button visible/enabled/disabled per contract and navigates to the workflow
3. Then add US2 prefill (T010–T012) and polish

## Notes

- Use only stock Backstage UI components; no custom widgets
- No new permissions or config keys; authorization only informs UX

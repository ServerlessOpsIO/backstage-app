# Phase 0 Research: My Services Homepage Widget

## Decision 1: Add the widget to the existing `home-module-info-hub` module

**Decision**: Implement the widget as a new `HomePageWidgetBlueprint` extension named `my-services` (widget component name `HomePageMyServices`) inside `@internal/backstage-plugin-home-module-info-hub`, alongside the Datadog, GitHub, Calendar and clock widgets.

**Rationale**:
- Requested by the feature owner.
- The module already owns ServerlessOps homepage widgets, the shared `WidgetStatePanel` and `WidgetDataState` model, and the InfoCard-plus-Table pattern this widget needs.
- No new package registration is needed; the module is already installed in `src/packages/app/src/App.tsx`.

**Alternatives considered**:
- Use the stock `@backstage/plugin-home` "Starred Entities" or "Owned entities" style cards: no stock card lists owned services with owner, lifecycle, paging and a filtered "View all" link.
- New frontend module package: rejected; it would duplicate the module's shared widget infrastructure.

## Decision 2: No backend code is needed; query the catalog from the frontend

**Decision**: Read owned services directly through the existing catalog backend using `catalogApiRef` from `@backstage/plugin-catalog-react`. No new backend plugin or endpoint is created.

**Rationale**:
- The catalog backend already exposes entity queries and enforces the permission framework (`permission.enabled: true`), satisfying FR-012 without extra code.
- No new credentials or external integrations are involved (spec assumption; constitution IV).
- The feature owner's direction was that any backend code go in a separate plugin. Because none is required, that plugin is not created. If a later requirement (e.g., parent-group inheritance) needs server-side resolution, it goes in a new `src/plugins/<name>-backend` plugin, following the `datadog-backend` precedent.

**Alternatives considered**:
- Backend endpoint that resolves ownership server-side: rejected as unnecessary indirection with an extra deployable surface and its own auth/permission handling.

## Decision 3: Resolve "my ownership" from the signed-in identity's `ownershipEntityRefs`

**Decision**: Use `identityApiRef.getBackstageIdentity()` and its `ownershipEntityRefs`, which contain the user's own entity ref plus the refs of the groups they are a direct member of.

**Rationale**:
- All configured sign-in resolvers (`emailMatchingUserEntityProfileEmail`, `emailLocalPartMatchingUserEntityName`, `emailMatchingUserEntityAnnotation`) are built-in catalog resolvers. They issue tokens whose ownership refs are the user ref plus the user's `memberOf` groups, which matches the spec's "directly or via direct group membership" scope exactly.
- It is the same source the catalog's own "Owned" filter uses, so the widget and the "View all" link agree.
- Guest/local sign-in yields only the guest user ref, which owns nothing, producing the empty state required by the spec's edge cases.

**Alternatives considered**:
- Fetch the user entity and walk `memberOf` relations in the browser: duplicates what the token already provides and costs extra requests.
- Include parent-group inheritance: out of scope per spec assumptions.

## Decision 4: One filtered catalog request, then sort and page client-side

**Decision**: Call `catalogApi.getEntities` once with filter `{ kind: 'component', 'spec.type': 'service', 'relations.ownedBy': ownershipEntityRefs }` and a `fields` projection (`kind`, `metadata.namespace`, `metadata.name`, `metadata.title`, `spec.lifecycle`, `spec.owner`, `relations`). Sort by displayed name (title, falling back to name, case-insensitive) and page in the table at 10 rows per page.

**Rationale**:
- A single filter whose `relations.ownedBy` value is an array is evaluated as OR across the refs, and each matching entity is returned once. This satisfies FR-003, FR-004 and FR-005 with no client-side de-duplication.
- FR-008 requires sorting by the displayed name (title or name). Server-side ordering can sort on only one field, so it cannot express "title, else name"; client-side sorting can.
- The number of services owned by one user and their groups is small (tens, rarely low hundreds), so one projected request comfortably meets SC-004 (results within 3 s).

**Alternatives considered**:
- `queryEntities` with cursor paging and `orderFields: metadata.name`: rejected because it orders by `name`, not displayed title, and adds cursor-state complexity for little benefit at this scale.
- One request per ownership ref: rejected; more requests and needs manual de-duplication.

## Decision 5: Columns, links and "View all"

**Decision**:
- Columns: **Service** (`EntityRefLink` with title fallback), **Owner** (`EntityRefLink` to the `ownedBy` target), **Lifecycle** (plain text, blank if absent).
- Footer "View all" link to `/catalog?filters[kind]=component&filters[type]=service&filters[user]=owned`.

**Rationale**:
- `EntityRefLink` from `@backstage/plugin-catalog-react` resolves catalog routes and display titles consistently with the rest of the portal (FR-006, FR-007).
- The catalog index's `filters[user]=owned` uses the same `ownershipEntityRefs`, so "View all" shows the same set the widget shows (FR-010).

**Alternatives considered**:
- Build entity URLs by hand: rejected; duplicates catalog routing logic.
- Encode explicit `filters[owners]=...` refs in the link: rejected; it leaks group refs into the URL and diverges if memberships change.

## Decision 6: Homepage placement

**Decision**: Add `HomePageMyServices` to the default homepage layout in `src/app-config.yaml` at `column: 0, row: 12, width: 9, height: 8`. Shift the four GitHub widgets down by 8 rows and extend `HomePageGoogleCalendarToday` to `height: 28`, so the calendar still spans the full left-hand stack.

**Rationale**:
- Owned services are a primary developer context, so the widget leads the personalized left-hand stack below the Datadog/Toolkit/Clock row.
- Width 9 matches the GitHub widgets' column; height 8 fits 10 dense rows plus header and pager.
- All widgets required by spec 005 keep their place in the layout (FR-013).

**Alternatives considered**:
- Full-width row above the stack: rejected; it breaks the calendar's alignment with the left-hand stack.
- Right-hand column under the calendar: rejected; 3 columns are too narrow for a three-column table.

**Risk**: Users with a saved custom homepage layout won't see new default widgets until they add the widget or use the homepage's restore-default-layout action. This is documented in the module README, and the widget is listed in the "add widget" catalog for manual addition.

## Decision 7: Testing approach

**Decision**: Colocated Jest tests in `src/plugins/home-module-info-hub/src/components/my-services-widget.test.tsx`, rendering the widget with `TestApiProvider` and stubbed `catalogApiRef` and `identityApiRef`. Cover: direct ownership, group ownership, exclusion of unowned services (asserting the filter sent), single listing, sorting, links, lifecycle absence, paging beyond 10, empty, unavailable, and loading states.

**Rationale**: Matches the module's existing colocated tests (`datadog-monitors-widget.test.tsx`). It is the narrowest useful automated test per constitution V and uses `test()` per the repository conventions. Catalog filter correctness (OR semantics, permission enforcement) is catalog-backend behavior, covered by upstream tests and by the quickstart's manual validation.

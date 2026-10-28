# Phase 0 Research: Homepage Useful Information Hub

## Decision 1: Reuse existing Backstage Home widgets for baseline cards

**Decision**: Keep `HomePageSearchBar` and `HomePageToolkit` as existing Backstage Home widgets and update only their configuration values. Keep world clock in the same homepage card family, but satisfy the "local timezone + UTC" requirement with a dynamic local timezone value instead of a fixed city label.

**Rationale**:
- The app already uses Backstage Home default components in `src/app-config.yaml`.
- Reuse minimizes custom code and keeps compatibility with Backstage homepage layout management.
- Toolkit links are pure configuration and should remain config-driven.

**Alternatives considered**:
- Build a custom search/toolkit implementation: rejected because it duplicates existing Home capabilities.
- Leave world clock as fixed `America/New_York` + UTC: rejected because it does not satisfy per-user local timezone.

## Decision 2: Implement new functionality as a dedicated Backstage plugin module

**Decision**: Create a new frontend plugin module package named `@internal/backstage-plugin-home-module-info-hub` and register it from `src/packages/app/src/App.tsx`.

**Rationale**:
- Matches repository and Backstage naming conventions (`@internal/backstage-plugin-<pluginId>-module-<name>`).
- Keeps new feature logic out of the app shell and inside workspace plugin boundaries required by the constitution.
- Allows independent testing and future reuse of homepage widgets.

**Alternatives considered**:
- Add all logic to `src/packages/app/src/modules/home/homeModule.tsx`: rejected due to reduced modularity and weaker ownership boundaries.
- Build no new plugin and rely only on YAML: rejected because personalized GitHub/Calendar data requires code.

## Decision 3: Use user-scoped OAuth access tokens via Backstage auth APIs

**Decision**: Retrieve tokens in frontend widget clients using Backstage auth APIs (`githubAuthApiRef`, `googleAuthApiRef`) so each widget queries data for the signed-in user.

**Rationale**:
- Directly satisfies clarified requirement for per-user linked accounts.
- Backstage auth provider support is already present in backend composition and production config.
- Keeps data retrieval scoped to the user without introducing shared service-account behavior.

**Alternatives considered**:
- Shared service account for GitHub/Google: rejected by clarified requirement.
- Backend-only polling without user token context: rejected because it cannot represent per-user work views correctly.

## Decision 4: Prefer vendor integrations where available

**Decision**:
- Use `@octokit/rest` for GitHub issue/PR retrieval.
- Use Google Calendar v3 official REST endpoint for primary-calendar "today" events with the user OAuth token.

**Rationale**:
- Aligns with request to use vendor libraries/SDKs where possible.
- Octokit provides stable pagination/error semantics for GitHub.
- Google Calendar REST is the supported contract for event retrieval and avoids custom proxy complexity for this feature.

**Alternatives considered**:
- Raw fetch for GitHub: rejected in favor of Octokit SDK robustness.
- Third-party calendar wrappers: rejected in favor of official API.

## Decision 5: Normalize all external responses into a common widget state model

**Decision**: Each personalized widget uses the same state machine (`loading`, `ready`, `empty`, `unavailable`) and explicit user-facing messages for no-data and failure.

**Rationale**:
- Directly satisfies FR-014.
- Prevents one service failure from affecting other homepage widgets.
- Supports shared rendering and consistent tests.

**Alternatives considered**:
- Implicit empty arrays on failure: rejected because it hides outages and violates explicit unavailable-state requirement.

## Decision 6: Produce at least two layout variants as review artifacts

**Decision**: Define two complete widget arrangements (Variant A and Variant B) and capture screenshots/mockups for stakeholder review before final layout freeze.

**Rationale**:
- Required by FR-015/FR-016.
- Preserves all required widgets in both arrangements.
- Enables quick stakeholder comparison without blocking initial implementation.

**Alternatives considered**:
- Single initial layout only: rejected by requirement.

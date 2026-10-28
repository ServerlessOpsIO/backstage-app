# Quickstart: Validate Homepage Useful Information Hub

This guide validates the feature end-to-end in development.  
Data contracts: `contracts/homepage-info-hub-ui-contracts.md`  
Entity/state model: `data-model.md`

## Prerequisites

- Node.js `v24.16.0`
- Yarn `4.x`
- Backstage auth providers configured for Google and GitHub in active environment config
- A test user with:
  - GitHub account linked/authorized
  - Google account linked/authorized

## Setup

From repository root:

```bash
cd src
yarn install
```

Run Backstage:

```bash
yarn start
```

Open `http://localhost:3000` and sign in as the test user.

## Validation Scenario 1: Baseline utility widgets (P1)

1. Navigate to Home (`/`).
2. Confirm search bar is the topmost widget.
3. Confirm toolkit links exist and navigate correctly:
   - AWS
   - GitHub
   - Datadog
   - Google Workspace
4. Confirm world clock shows:
   - Local time with timezone label/indicator
   - UTC time

Expected outcome:
- Meets FR-001..FR-007 and SC-001..SC-002.

## Validation Scenario 2: GitHub personal work widgets (P2)

1. Verify all four widgets render:
   - Opened Issues
   - Assigned Issues
   - Opened Pull Requests
   - Review Requested Pull Requests
2. For each widget:
   - Validate loading state appears first.
   - Validate one of: populated list, explicit empty state, explicit unavailable state.
3. Cross-check at least one returned item against the user’s GitHub account.

Expected outcome:
- Meets FR-008..FR-012 and FR-014.

## Validation Scenario 3: Google Calendar today widget (P3)

1. Confirm the "Today" calendar widget renders.
2. Verify events are from the user’s primary calendar and limited to today.
3. Validate explicit empty state when user has no events.
4. Validate explicit unavailable state by revoking Google access and reloading.

Expected outcome:
- Meets FR-013 and FR-014.

## Validation Scenario 4: Layout variants for stakeholder review (P3)

1. Configure/render Variant A and Variant B layouts.
2. Capture screenshots/mockups for both variants.
3. Verify each variant preserves full required widget set and toolkit links.

Expected outcome:
- Meets FR-015..FR-016 and SC-005.

## Automated Validation Commands

From `src/`:

```bash
yarn tsc:full
yarn lint:all
yarn test:all
```

If homepage e2e coverage is added:

```bash
yarn test:e2e
```

Expected outcome:
- No TypeScript, lint, or test regressions in modified areas.

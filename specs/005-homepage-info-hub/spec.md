# Feature Specification: Homepage Useful Information Hub

**Feature Branch**: `[005-homepage-info-hub]`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "As a user I would like the home page to present me with useful information.

- At the top of the homepage should be a search bar.
- The toolkit widget should contain the following links
    - AWS: https://serverlessops.awsapps.com/start/#/
    - Github: https://github.com/ServerlessOpsIO
    - Datadog: https://us5.datadoghq.com/account/login
    - Google Workspace: https://admin.google.com
- The world clocks box should have the local time (and timezone) plus UTC
- Github widgets for
    - User's open issues
    - User's open PRs
    - PRs user has been requested to review.
- Widget for user's google calendar

The final layout for the widgets on the page is as of this moment undecided and will be determined by viewing multiple requested layouts after initial page is done."

## Clarifications

### Session 2026-10-28

- Q: Should the GitHub widgets retrieve data using each portal user's own linked GitHub account or a shared service account? → A: Each user's linked GitHub account.
- Q: Which open issues and pull requests should count as a user's work? → A: Separate widgets for issues opened, issues assigned, pull requests opened, and pull requests requested for review.
- Q: Which Google Calendar should each user see on the homepage? → A: Each user's primary calendar, using their own Google authorization.
- Q: What time period should the Google Calendar widget display? → A: Today only.
- Q: How should stakeholders compare the alternative homepage layouts? → A: Screenshots or mockups.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find tools and time quickly (Priority: P1)

As a user, I can immediately use homepage search and see key utility information so I can start work without navigating elsewhere first.

**Why this priority**: This is the core homepage outcome and provides immediate day-to-day value to every user.

**Independent Test**: Open the homepage and verify the search bar appears at the top, the toolkit widget shows all required links, and the world clocks widget shows both local time with timezone and UTC.

**Acceptance Scenarios**:

1. **Given** a signed-in user opens the homepage, **When** the page loads, **Then** a search bar is visible at the top of the page.
2. **Given** the user views the toolkit widget, **When** links are shown, **Then** AWS, GitHub, Datadog, and Google Workspace links are present and open the correct destinations.
3. **Given** the user views world clocks, **When** time is displayed, **Then** local time includes a timezone indicator and UTC is shown alongside it.

---

### User Story 2 - Track personal GitHub work (Priority: P2)

As a user, I can see issues I opened, issues assigned to me, pull requests I opened, and pull requests requesting my review in separate homepage widgets so I can prioritize work without opening separate dashboards.

**Why this priority**: Personal work visibility is a key productivity improvement but depends on the foundational homepage widgets being present.

**Independent Test**: Open the homepage with the user's linked GitHub account and confirm separate widgets show issues opened by the user, issues assigned to the user, pull requests opened by the user, and pull requests requesting the user's review.

**Acceptance Scenarios**:

1. **Given** the user has opened GitHub issues, **When** the homepage loads, **Then** an opened issues widget lists those items.
2. **Given** GitHub issues are assigned to the user, **When** the homepage loads, **Then** an assigned issues widget lists those items.
3. **Given** the user has opened GitHub pull requests, **When** the homepage loads, **Then** an opened pull requests widget lists those items.
4. **Given** the user has pending review requests, **When** the homepage loads, **Then** a review-requested pull requests widget lists those items.

---

### User Story 3 - See schedule and evaluate layout options (Priority: P3)

As a user, I can view today's events from my primary Google Calendar on the homepage and stakeholders can review screenshot or mockup alternatives to choose the most useful final arrangement.

**Why this priority**: Calendar context and layout refinement improve usability, but the page remains valuable even before final layout selection.

**Independent Test**: Confirm a Google Calendar widget shows today's events from the user's primary calendar and confirm stakeholders can review at least two screenshot or mockup layout variations.

**Acceptance Scenarios**:

1. **Given** the user has authorized access to Google Calendar, **When** the homepage loads, **Then** a calendar widget displays events for today from the user's primary calendar.
2. **Given** an initial homepage version is available, **When** stakeholders review alternative arrangements, **Then** at least two screenshot or mockup layout options can be presented.
3. **Given** a selected layout is not yet finalized, **When** users access the homepage, **Then** all required widgets still remain accessible and usable.

### Edge Cases

- A user has no opened or assigned GitHub issues, opened pull requests, or review requests.
- A user has no upcoming Google Calendar events.
- A user has not connected or lacks access to one external service (GitHub or Google Calendar).
- Local timezone cannot be resolved from user context.
- One or more external services are temporarily unavailable.
- Requested layout variations change arrangement but must continue to include all required widgets and links.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a search bar at the top of the homepage.
- **FR-002**: The system MUST display a toolkit widget containing links for AWS, GitHub, Datadog, and Google Workspace.
- **FR-003**: The AWS toolkit link MUST navigate to `https://serverlessops.awsapps.com/start/#/`.
- **FR-004**: The GitHub toolkit link MUST navigate to `https://github.com/ServerlessOpsIO`.
- **FR-005**: The Datadog toolkit link MUST navigate to `https://us5.datadoghq.com/account/login`.
- **FR-006**: The Google Workspace toolkit link MUST navigate to `https://admin.google.com`.
- **FR-007**: The system MUST display a world clocks widget that includes both local time with timezone and UTC.
- **FR-008**: The system MUST use the signed-in user's linked GitHub account to retrieve their GitHub work items.
- **FR-009**: The system MUST display a widget for open GitHub issues opened by the signed-in user.
- **FR-010**: The system MUST display a separate widget for open GitHub issues assigned to the signed-in user.
- **FR-011**: The system MUST display a widget for open GitHub pull requests opened by the signed-in user.
- **FR-012**: The system MUST display a widget for open pull requests where the signed-in user has been requested as a reviewer.
- **FR-013**: The system MUST display a widget for today's events on the signed-in user's primary Google Calendar, using that user's Google authorization.
- **FR-014**: If GitHub or Google Calendar data cannot be retrieved, the affected widget MUST show an explicit unavailable or no-data state without hiding other homepage widgets.
- **FR-015**: At least two alternative widget layouts MUST be presented as screenshots or mockups for stakeholder review before finalizing a single arrangement.
- **FR-016**: Every proposed layout variation MUST preserve the full required widget set and required toolkit links.

### Key Entities *(include if feature involves data)*

- **Homepage Widget**: A homepage information module (search, toolkit, clocks, GitHub work items, calendar) with a title, content state, and visibility state.
- **Toolkit Link**: A named quick-access destination with a required label and fixed URL.
- **User Work Item Summary**: The signed-in user's GitHub issues opened, issues assigned, pull requests opened, and pull requests requesting review, retrieved using that user's linked GitHub account.
- **Clock Display**: Time data shown for local timezone and UTC.
- **Layout Variant**: A specific arrangement of homepage widgets used for stakeholder comparison before final layout selection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of homepage loads show the search bar at the top and include the toolkit and world clocks widgets.
- **SC-002**: 100% of toolkit links route users to their specified destinations when selected.
- **SC-003**: At least 95% of users can identify their opened issues, assigned issues, opened pull requests, and pending review requests from the homepage in under 30 seconds.
- **SC-004**: At least 90% of users can confirm their local time, timezone, and UTC from the world clocks widget in under 10 seconds.
- **SC-005**: At least two distinct widget layout screenshots or mockups are presented for stakeholder review prior to final layout selection.

## Assumptions

- Users accessing this homepage are authenticated in the portal.
- Users who need personalized GitHub and Google Calendar content have linked or authorized their own accounts for those services.
- Selecting and finalizing one long-term widget arrangement is out of scope for this initial feature and follows stakeholder review of multiple variants.
- The homepage remains usable when one external data source is unavailable by showing a clear unavailable or empty state for only the affected widget.

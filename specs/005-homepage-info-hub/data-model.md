# Data Model: Homepage Useful Information Hub

## 1. HomepageWidgetDefinition

Represents one widget rendered on the homepage layout.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string | Yes | Stable component ID used by Home layout config |
| title | string | Yes | Visible card title |
| source | enum(`built-in`,`custom-plugin`) | Yes | Indicates whether card is native Home card or new plugin card |
| column | number | Yes | Grid column |
| row | number | Yes | Grid row |
| width | number | Yes | Grid width |
| height | number | Yes | Grid height |
| deletable | boolean | No | Defaults to Backstage behavior |

**Validation rules**:
- `id` must be unique within one layout variant.
- All required widgets from FR-001..FR-013 must be present in every published layout variant.

## 2. ToolkitLink

Represents a quick-access external link in toolkit widget.

| Field | Type | Required | Notes |
|---|---|---|---|
| label | string | Yes | AWS, GitHub, Datadog, Google Workspace |
| url | string (https URL) | Yes | Fixed destination from requirements |
| icon | string | No | Backstage icon token |

**Validation rules**:
- URL must be `https://`.
- Required labels and URLs must exactly match FR-003..FR-006.

## 3. GitHubWorkQuery

Defines one query shape for user-specific GitHub work widgets.

| Field | Type | Required | Notes |
|---|---|---|---|
| category | enum(`issues-opened`,`issues-assigned`,`prs-opened`,`prs-review-requested`) | Yes | One widget per category |
| maxItems | number | Yes | UI-bound list size (e.g., 5–20) |
| includeStates | string[] | Yes | Default `["open"]` |

**Validation rules**:
- Exactly one category per widget.
- `maxItems` must be positive and bounded for rendering consistency.

## 4. GitHubWorkItem

Normalized item rendered in any GitHub work widget.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string/number | Yes | GitHub issue/PR ID |
| kind | enum(`issue`,`pull_request`) | Yes | Normalized work item kind |
| title | string | Yes | Item title |
| repoFullName | string | Yes | `owner/repo` |
| url | string | Yes | Browser URL |
| number | number | Yes | Issue/PR number |
| updatedAt | string (ISO datetime) | Yes | Sort/display field |
| authorLogin | string | Yes | User handle |

**Validation rules**:
- `url` must be valid HTTPS GitHub URL.
- `kind` must match source collection.

## 5. CalendarDayQuery

Defines retrieval for today’s events from primary Google Calendar.

| Field | Type | Required | Notes |
|---|---|---|---|
| calendarId | string | Yes | Fixed `primary` |
| timeMin | string (ISO datetime) | Yes | Start of local day |
| timeMax | string (ISO datetime) | Yes | End of local day |
| singleEvents | boolean | Yes | `true` |
| orderBy | string | Yes | `startTime` |

**Validation rules**:
- `timeMin < timeMax`.
- Query window must represent current local day for the signed-in user.

## 6. CalendarEventSummary

Normalized event rendered in calendar widget.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string | Yes | Google event ID |
| summary | string | No | Event title, default fallback if missing |
| start | string | Yes | ISO datetime or date |
| end | string | Yes | ISO datetime or date |
| htmlLink | string | No | Link to Google Calendar event |
| isAllDay | boolean | Yes | Derived from API fields |

**Validation rules**:
- `start <= end`.
- Empty list is valid and displayed as explicit "no events today."

## 7. WidgetDataState

Shared UI state model for GitHub and Calendar widgets.

| Field | Type | Required | Notes |
|---|---|---|---|
| status | enum(`idle`,`loading`,`ready`,`empty`,`unavailable`) | Yes | Core widget state machine |
| message | string | No | User-facing detail for empty/unavailable |
| lastUpdatedAt | string (ISO datetime) | No | Optional timestamp |

**Validation rules**:
- `ready` requires data payload present.
- `empty` and `unavailable` must provide explicit message text.

## 8. LayoutVariant

Represents one candidate widget arrangement for stakeholder review.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string | Yes | e.g., `variant-a`, `variant-b` |
| description | string | Yes | Human-readable rationale |
| widgets | HomepageWidgetDefinition[] | Yes | Full layout, not partial |
| artifactPath | string | Yes | Screenshot/mockup path or URL |

**Validation rules**:
- At least two variants must exist before final selection.
- Every variant must include all required widget IDs and toolkit links.

## Relationships

- `LayoutVariant.widgets[]` contains multiple `HomepageWidgetDefinition`.
- `HomepageWidgetDefinition` for toolkit references `ToolkitLink[]`.
- Each GitHub widget (`HomepageWidgetDefinition`) maps to one `GitHubWorkQuery` and many `GitHubWorkItem`.
- Calendar widget maps to one `CalendarDayQuery` and many `CalendarEventSummary`.
- Every personalized widget uses `WidgetDataState`.

## State Transitions

`WidgetDataState.status` transitions:

1. `idle -> loading` when homepage mounts or user triggers refresh.
2. `loading -> ready` when API call succeeds with results.
3. `loading -> empty` when API call succeeds with zero results.
4. `loading -> unavailable` when auth or API retrieval fails.
5. `ready|empty|unavailable -> loading` on retry/refresh.

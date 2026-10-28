# Contracts: Homepage Info Hub UI Interfaces

This feature is a Backstage web application enhancement; the primary contracts are UI/data-service interfaces between homepage widgets and external providers.

## 1) Home Widget Registration Contract

**Provider**: `@internal/backstage-plugin-home-module-info-hub`  
**Consumer**: Backstage `home` plugin layout configuration

### Widget IDs (must be stable)

- `HomePageGitHubOpenedIssues`
- `HomePageGitHubAssignedIssues`
- `HomePageGitHubOpenedPrs`
- `HomePageGitHubReviewRequestedPrs`
- `HomePageGoogleCalendarToday`

### Requirements

- IDs are unique and used by `page:home.defaultConfig`.
- Each widget renders independent loading/empty/unavailable states.
- Removal or rename of IDs is a breaking change for persisted layouts.

## 2) GitHub Work Data Client Contract

**Provider**: `github-work-client.ts` (new plugin module)  
**External dependency**: GitHub API via Octokit with user token from `githubAuthApiRef`

### Input

```ts
type GitHubWorkCategory =
  | 'issues-opened'
  | 'issues-assigned'
  | 'prs-opened'
  | 'prs-review-requested'

interface GitHubWorkRequest {
  category: GitHubWorkCategory
  maxItems: number
}
```

### Output

```ts
interface GitHubWorkItem {
  id: number
  kind: 'issue' | 'pull_request'
  title: string
  repoFullName: string
  url: string
  number: number
  updatedAt: string
  authorLogin: string
}

type GitHubWorkResult =
  | { status: 'ready'; items: GitHubWorkItem[] }
  | { status: 'empty'; message: string }
  | { status: 'unavailable'; message: string }
```

### Behavior guarantees

- `status: ready` only when at least one normalized item exists.
- `status: empty` when request succeeds and result set is empty.
- `status: unavailable` for token acquisition failures, permission failures, or API errors.

## 3) Google Calendar Today Client Contract

**Provider**: `google-calendar-client.ts` (new plugin module)  
**External dependency**: Google Calendar v3 REST API with user token from `googleAuthApiRef`

### Input

```ts
interface CalendarTodayRequest {
  calendarId: 'primary'
  now: Date
}
```

### Output

```ts
interface CalendarEventSummary {
  id: string
  summary?: string
  start: string
  end: string
  htmlLink?: string
  isAllDay: boolean
}

type CalendarTodayResult =
  | { status: 'ready'; events: CalendarEventSummary[] }
  | { status: 'empty'; message: string }
  | { status: 'unavailable'; message: string }
```

### Behavior guarantees

- Query window is local-day bounded (`timeMin` start-of-day, `timeMax` end-of-day).
- Empty day is not treated as error.
- Auth/API failures return explicit unavailable state.

## 4) Homepage Configuration Contract

**Provider**: `src/app-config*.yaml`  
**Consumer**: Backstage Home page renderer

### Required configuration outcomes

- `HomePageSearchBar` remains first row widget.
- Toolkit links include exact required URLs:
  - AWS: `https://serverlessops.awsapps.com/start/#/`
  - GitHub: `https://github.com/ServerlessOpsIO`
  - Datadog: `https://us5.datadoghq.com/account/login`
  - Google Workspace: `https://admin.google.com`
- World clock presents Local timezone + UTC.
- Two layout variants are produced for review artifacts; each includes all required widget IDs.

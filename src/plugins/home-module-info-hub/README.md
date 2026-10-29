# @internal/backstage-plugin-home-module-info-hub

This frontend module extends the Backstage `home` plugin with the homepage information hub widgets used by ServerlessOps.

The module owns custom homepage cards for:

- A locally bundled ServerlessOps logo, centered in a full-width row between
  search and the top row of widgets
- Local + UTC clock visibility
- GitHub personal work summaries
- Datadog monitors matching the configured alert query
- Today's Google Calendar events

All four GitHub widgets use the standard Backstage Table component with
Repository, #, and Description columns, styled like the catalog table with a
highlighted repository column, themed links, and overflow tooltips for descriptions.
The repository links to GitHub, and the number links to the issue or pull request.
Tables sit directly below the widget header divider without an inset card surface.
Each GitHub widget shows five items per page and loads additional pages from
GitHub using the table's pagination controls. GitHub Search limits pagination to
the first 1,000 matches.
The default homepage layout stacks the four GitHub widgets vertically across the
left 75% of the grid. Today's Calendar occupies the right 25%, spanning all four
GitHub widgets from Opened Issues through Review Requested Pull Requests.

The homepage uses the standard customizable grid. Each GitHub widget is configured
with a height of six grid rows (410 pixels) to fit five entries and pagination.
If a saved layout overrides these defaults, use the homepage's restore-default
layout action to apply the updated sizes.

It is registered by the app shell in `packages/app/src/App.tsx`.
The app shell also centers the links in the standard Toolkit widget.

Today's Calendar uses a standard Backstage table with Event and Time columns,
directly below its header divider. Times are displayed in the browser's local
timezone; all-day events show "All day".
Its heading shows the selected local weekday, month, and day. Previous and Next
controls at the bottom load the adjacent day's events; Today returns to the
current local day.

## Google Calendar

Enable the Google Calendar API in the Google Cloud project used by Backstage's
Google OAuth client. The homepage calendar widget requires this API to read the
signed-in user's calendar; otherwise, requests can fail with HTTP 403.

## Datadog monitors

The Datadog widget sits in the upper-left corner beside Toolkit and lists five monitors per page
in Priority, Status, and Name columns. Names link to Datadog. Pagination loads
additional results from the backend; missing priorities display "Not set".
Status chips are red for Alert, green for OK, gray for No Data, and amber for Warn.

The authenticated `/api/datadog/monitors` backend endpoint uses the existing
`integrations.datadog.server`, `integrations.datadog.authMethods.apiKeyAuth`, and
`integrations.datadog.authMethods.appKeyAuth` settings. Keep both keys on the
backend. The application key needs monitor read access (`monitors_read`).

The backend implementation and its colocated tests live in the separate
[`datadog-backend` plugin](../datadog-backend/README.md).

Set the backend's `home.datadog.query` to a Datadog monitor search query. The
default is `status:Alert`; to include warnings, use
`status:(Alert OR Warn)`, optionally combined with tags such as `tag:env:production`.
Results are always restricted to Alert and Warn states. Restore the homepage's
default layout if a saved layout hides the new widget.

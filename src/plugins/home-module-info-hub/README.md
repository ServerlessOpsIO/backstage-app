# @internal/backstage-plugin-home-module-info-hub

This frontend module extends the Backstage `home` plugin with the homepage information hub widgets used by ServerlessOps.

The module owns custom homepage cards for:

- ServerlessOps branding, using a bundled logo to the left of Toolkit
- Local + UTC clock visibility
- GitHub personal work summaries
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

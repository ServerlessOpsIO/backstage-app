# @internal/backstage-plugin-home-module-info-hub

This frontend module extends the Backstage `home` plugin with the homepage information hub widgets used by ServerlessOps.

The module owns custom homepage cards for:

- Local + UTC clock visibility
- GitHub personal work summaries
- Today's Google Calendar events

It is registered by the app shell in `packages/app/src/App.tsx`.

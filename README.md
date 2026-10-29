# Backstage Application

Backstage Application and ECS Service task.

## Google Calendar

Enable the Google Calendar API in the Google Cloud project used by Backstage's
Google OAuth client. The homepage calendar widget requires this API to read the
signed-in user's calendar; otherwise, requests can fail with HTTP 403.

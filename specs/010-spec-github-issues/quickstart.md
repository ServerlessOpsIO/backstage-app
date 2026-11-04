# Quickstart: Validate

1. **Unit**: `cd src && yarn test:all` (or `yarn workspace @internal/backstage-plugin-scaffolder-backend-module-github test`); `issue-create.test.ts` covers title/labels/body passthrough, missing token, non-github host, API error, same-run retry reuse, and distinct issues across runs.
2. **Static**: `cd src && yarn tsc:full && yarn lint:all && yarn build:all`.
3. **Form**: run Backstage locally, open Create → "Create feature spec"; confirm radio with 3 options, required markers on title/story/solution, 10-row and 5-row textareas, acceptance criteria prefilled with `- [ ] ...`, story hint "As a ____, I can ____".
4. **Filing**: submit the form against a test repo; confirm a new open issue with the spec title, label equal to the spec type, and body matching [contracts/spec-form.md](contracts/spec-form.md).
5. **Repeat**: retry the same workflow run and confirm no duplicate issue; start a new run and confirm it creates a second, distinct issue.

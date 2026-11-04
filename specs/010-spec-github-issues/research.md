# Research: Spec Form and Issue Filing

## D1. Where the form lives
- **Decision**: Scaffolder template `parameters` page in `template-spec.yaml` of `backstage-github-speckit-feature` (already registered in `app-config.production.yaml`).
- **Rationale**: "Create feature spec" is a scaffolder workflow, and the Specs page button (008) links to it. The standard form renderer (rjsf) covers every required field type without frontend code.
- **Alternatives**: A custom React page in `src/packages/app` (rejected: breaks the 008 flow, needs bespoke code and routing).

## D2. Field mapping to JSON Schema / UI
- **Decision**:
  - `specType`: `type: string`, `enum: [feature, bug, documentation]`, `ui:widget: radio`, `default: feature`, required.
  - `specTitle`: string, `minLength: 1`, required.
  - `storySentence`: string, `minLength: 1`, required, `ui:help`/description "As a ____, I can ____", `ui:placeholder` "As a ____, I can ____".
  - `proposedSolution`: string, required, `ui:widget: textarea`, `ui:options.rows: 10`.
  - `additionalContext`: string, optional, textarea, `rows: 5`.
  - `acceptanceCriteria`: string, textarea, `rows: 5`, `default: "- [ ] ..."`.
- **Rationale**: Those are built-in rjsf/Backstage options. Single-line fields use the default text widget.
- **Note**: The input does not mark acceptance criteria required, so it is optional, prefilled, and passed through as-is.

## D3. Issue filing mechanism
- **Decision**: New action `x_github:issue:create` in `scaffolder-backend-module-github`, calling `POST /repos/{owner}/{repo}/issues` with title, body, labels via `createUserOctokit`.
- **Rationale**: Existing module already follows this pattern (`x_github:pr:comment`), acts as the user, and is unit-tested the same way. The built-in `github:issues:label` only labels; no built-in creates issues.
- **Alternatives**: Raw `http:backstage:request` (no GitHub auth handling); `octokit` in template (not possible).

## D4. Repeat behavior (FR-003)
- **Decision**: The action uses the scaffolder task ID as its idempotency key. A retry in the same run finds and returns its issue; a separate workflow run has a different ID and creates a new issue.
- **Rationale**: This produces a fresh issue on every intentional workflow run while keeping retries within a run idempotent, as required by the repository's scaffolder conventions.
- **Key source**: The action derives the key from its task context; it must not use a stable spec title or other value shared across runs.
- **Marker**: The key is appended as a hidden `<!-- spec-key: <task-id> -->` HTML comment and searched before issue creation.

## D5. Body format
- **Decision**: The template assembles the body exactly per the input layout (blank line between sections) and passes it as `body`; the action does no body templating.
- **Heading caveat**: GitHub requires a space after `#` for a Markdown heading, so `##Proposed Solution` renders as plain text. The input is followed verbatim; flagged to the user as an open question (switching to `## Proposed Solution` is a one-line change in the template).
- **Empty additional context**: section is kept with empty content to match the layout exactly.

## D4b. Labels
- **Decision**: Label = the raw spec type value (`feature`, `bug`, `documentation`). GitHub auto-creates unknown labels on issue creation; `bug` and `documentation` exist by default, `feature` may be created on first use (default label is `enhancement`).

## D6. Permissions and failure
- **Decision**: Template requests the user's token via `requestUserCredentials`; the action throws with owner/repo and API message on failure (mirrors `pr-comment`).

# Data Model

## SpecForm (template input, not persisted)

| Field | Type | Required | UI | Default | Validation |
|---|---|---|---|---|---|
| `specType` | enum `feature` \| `bug` \| `documentation` | Yes | radio | `feature` | One of the three values |
| `specTitle` | string | Yes | single-line text | | Non-empty |
| `storySentence` | string | Yes | single-line text, instruction "As a ____, I can ____" | | Non-empty |
| `proposedSolution` | string | Yes | textarea, 10 rows | | Non-empty |
| `additionalContext` | string | No | textarea, 5 rows | | |
| `acceptanceCriteria` | string | No | textarea, 5 rows | `- [ ] ...` | |

## SpecIssue (created in GitHub)

| Field | Source |
|---|---|
| `title` | `specTitle` |
| `labels` | `[specType]` |
| `body` | Layout in contracts/spec-form.md |
| state | open; never closed by automation |

Relationship: each distinct workflow run produces one SpecIssue. The action derives an idempotency key from the task ID, so retries in one run reuse that run's issue while a later run produces a new issue. The issue number/URL is an output of the action and is passed to later template steps.

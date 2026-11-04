# Data Model

No persisted data. Transient entities:

## ChangeSet
- `event_name`: `push` | `workflow_dispatch` | `schedule` | other
- `before`, `after`: commit SHAs (`before` may be all zeros or absent from the clone)
- `paths`: file paths in the final diff (renames expanded to old and new)

## Classification (output)
- `code_changed`: `"true"` | `"false"`
- Rule: `false` only if event is `push`, `before`/`after` resolvable, `paths` non-empty, and every path starts with `specs/`. Otherwise `true`. An empty diff is `true` (fail open).

## Gated job
- Runs iff `needs.changes.outputs.code_changed == 'true'`; otherwise skipped (counts as passing for required checks).

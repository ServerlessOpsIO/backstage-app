# Contract: Change Classification

## Script: `.github/scripts/classify-changes.sh`
- **Inputs (env)**: `EVENT_NAME`, `BEFORE_SHA`, `AFTER_SHA`
- **Output**: prints `code_changed=true|false` to stdout (appended to `$GITHUB_OUTPUT` by the workflow); exit 0 always (errors resolve to `true`)
- **Rules**: see [data-model.md](../data-model.md#classification-output)
- **Path match**: top-level prefix `specs/` only. `src/specs/x`, `SPECS.md`, and `specs-old/x` are code.

## Reusable workflow: `.github/workflows/changes.yml`
- Trigger: `workflow_call`
- Permissions: `contents: read`
- Output: `code_changed` (string)

## Consumer pattern (every workflow, present and future)
```yaml
jobs:
  changes:
    uses: ./.github/workflows/changes.yml
  <job>:
    needs: changes
    if: needs.changes.outputs.code_changed == 'true'
```
Triggers (`workflow_dispatch`, `push`, schedules) stay unchanged. Dispatch and schedule events always classify as `true`.

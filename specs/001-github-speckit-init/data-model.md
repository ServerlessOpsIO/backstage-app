# Data Model: GitHub Spec Kit Initialization Action

This feature adds no persisted domain data. Its inputs and execution context are
the transient scaffolder action invocation.

## Scaffolder Action Invocation

| Field | Type | Required | Description |
|---|---|---:|---|
| `workspacePath` | Absolute filesystem path | Yes (provided by Backstage context) | Root of the newly generated project and process working directory |

The action declares no user-provided input fields and no output fields.

## Process Execution

| Property | Value |
|---|---|
| Executable | `specify` |
| Arguments | `init`, `--non-interactive`, `--force`, `.` |
| Working directory | `workspacePath` |
| Success state | Process exits with status `0` |
| Failure state | Process cannot start, rejects, or exits with non-zero status; the scaffolder action fails |

Each invocation starts one process; repeated invocations are not deduplicated.

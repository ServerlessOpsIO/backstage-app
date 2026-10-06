# Scaffolder Action Contract

## Identifier

`github:copilot:speckit:init`

## Inputs and outputs

The action accepts no user-provided inputs and produces no outputs.

## Behavior

The action invokes `specify init --non-interactive --force .` (the doubled
space in the feature request is ordinary command-line whitespace) from the
scaffolder task's project workspace root. The action waits for the process to
finish.

The action succeeds only when the process exits with status `0`. If the
executable cannot be started or returns a non-zero exit status, the action
fails the scaffolder step with an actionable error. The scaffolder runtime
must have the `specify` executable available.

## Template usage

```yaml
steps:
  - id: initializeSpecKit
    name: Initialize Spec Kit
    action: github:copilot:speckit:init
```

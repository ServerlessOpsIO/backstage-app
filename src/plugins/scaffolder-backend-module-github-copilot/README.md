# backstage-plugin-scaffolder-backend-module-github-copilot

Scaffolder backend module that adds GitHub Copilot-related actions.

## Actions

### `github:copilot:speckit:init`

Initializes Spec Kit in the generated project workspace. Add it to a scaffolder
template after the project files have been generated:

```yaml
steps:
  - id: initializeSpecKit
    name: Initialize Spec Kit
    action: github:copilot:speckit:init
```

The action runs `specify init --non-interactive --force .` from the project
root. The scaffolder task runtime must have the `specify` executable on its
`PATH`; a missing executable or unsuccessful command fails the step.

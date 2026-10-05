# @internal/backstage-plugin-scaffolder-entity-pickers

This package provides the following field extensions for Backstage Scaffolder forms:

- `SoContextualEntityPicker`
- `SoRequestUserCredentials`

The picker allows templates to fetch and select catalog entities based on values selected earlier in the same form. It supports dynamic filtering using the current form context and can be used in template parameters as a drop-in replacement for the standard entity picker when later fields depend on upstream selections.

`SoRequestUserCredentials` is a side-effect-only hidden field that triggers the same `requestUserCredentials` flow used by Scaffolder SCM pickers and stores the resulting token in template secrets.

## Features

- Catalog-backed entity selection with `SoContextualEntityPicker`
- Dynamic `catalogFilter` support derived from current form data
- Optional `defaultKind` and `defaultNamespace` values for entity refs
- Restrictive behavior with `allowArbitraryValues: false`
- Support for `autoSelect` and `ui:disabled` semantics similar to Backstage `EntityPicker`
- Compatibility with the newer Backstage UI mode (`templates.config.enableBackstageUi`)

## Example usage

To request GitHub credentials without showing an interactive picker:

```yaml
githubAuth:
  type: string
  ui:field: SoRequestUserCredentials
  ui:options:
    host: github.com
    requestUserCredentials:
      secretsKey: USER_GITHUB_TOKEN
      additionalScopes:
        github:
          - read:user
```
The field is registered as a frontend module for the `scaffolder` plugin and exposed through the package default export:

```ts
import soContextualEntityPickerModule from '@internal/backstage-plugin-scaffolder-entity-pickers';

export default createApp({
  features: [soContextualEntityPickerModule],
});
```

This is useful when a template needs to narrow entity choices based on previous user input rather than showing an unfiltered catalog list.

# @internal/backstage-plugin-scaffolder-entity-pickers

This package provides the `SoContextualEntityPicker` field extension for Backstage Scaffolder forms.

The picker allows templates to fetch and select catalog entities based on values selected earlier in the same form. It supports dynamic filtering using the current form context and can be used in template parameters as a drop-in replacement for the standard entity picker when later fields depend on upstream selections.

## Features

- Catalog-backed entity selection with `SoContextualEntityPicker`
- Dynamic `catalogFilter` support derived from current form data
- Optional `defaultKind` and `defaultNamespace` values for entity refs
- Restrictive behavior with `allowArbitraryValues: false`
- Support for `autoSelect` and `ui:disabled` semantics similar to Backstage `EntityPicker`
- Compatibility with the newer Backstage UI mode (`templates.config.enableBackstageUi`)

## Example usage

```yaml
system:
  ui:field: SoContextualEntityPicker
  ui:options:
    allowArbitraryValues: false
    catalogFilter:
      - kind: System
        relations.partOf: "{{ parameters.domain }}"
```

The field is registered as a frontend module for the `scaffolder` plugin and exposed through the package default export:

```ts
import soContextualEntityPickerModule from '@internal/backstage-plugin-scaffolder-entity-pickers';

export default createApp({
  features: [soContextualEntityPickerModule],
});
```

This is useful when a template needs to narrow entity choices based on previous user input rather than showing an unfiltered catalog list.

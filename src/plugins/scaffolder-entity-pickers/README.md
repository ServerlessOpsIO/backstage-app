# @internal/backstage-plugin-scaffolder-entity-pickers

This package provides the `SoContextualEntityPicker` field extension for Backstage Scaffolder forms.

It renders an entity picker that can be filtered from the current form context, allowing later fields to depend on earlier selections. The picker is registered as a frontend module for the `scaffolder` plugin and can be used in template parameters with:

```yaml
ui:field: SoContextualEntityPicker
```

## Features

- Catalog-backed entity selection
- Dynamic `catalogFilter` support based on the current form data
- Optional `defaultKind` and `defaultNamespace` values for entity refs
- Support for restricting values with `allowArbitraryValues: false`

## Usage

Import the module in the app and add it to the frontend features list:

```ts
import soContextualEntityPickerModule from '@internal/backstage-plugin-scaffolder-entity-pickers';

export default createApp({
  features: [
    soContextualEntityPickerModule,
  ],
});
```

Then reference the field extension from a template parameter. For example:

```yaml
system:
  ui:field: SoContextualEntityPicker
  ui:options:
    allowArbitraryValues: false
    catalogFilter:
      - kind: System
        relations.partOf: "{{ parameters.domain }}"
```

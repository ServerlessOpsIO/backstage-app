# Contract: My Services Homepage Widget

## Extension

| Item | Value |
|------|-------|
| Package | `@internal/backstage-plugin-home-module-info-hub` |
| Extension | `HomePageWidgetBlueprint` named `my-services` → `home-page-widget:home/my-services` |
| Widget component name (layout id) | `HomePageMyServices` |
| Title | `My Services` |
| Description | `Services owned by you or your groups` |
| Renderer | `InfoCard` with divider and no padding (same as Datadog/GitHub widgets) |

## Default layout entry (`src/app-config.yaml` → `page:home.config.defaultConfig`)

```yaml
- component: HomePageMyServices
  column: 0
  row: 12
  width: 9
  height: 8
```

The GitHub widgets move to rows 20, 26, 32 and 38. `HomePageGoogleCalendarToday` stays at row 12 with `height: 28`. No other entries change.

## Catalog query (consumed, existing catalog API)

```ts
catalogApi.getEntities({
  filter: {
    kind: 'component',
    'spec.type': 'service',
    'relations.ownedBy': ownershipEntityRefs, // array => OR
  },
  fields: [
    'kind', 'metadata.namespace', 'metadata.name', 'metadata.title',
    'spec.lifecycle', 'spec.owner', 'relations',
  ],
})
```

- Must not be called when `ownershipEntityRefs` is empty.
- Results are subject to the catalog permission policy for the signed-in user.

## Rendered UI

| Element | Behavior |
|---------|----------|
| Table columns | **Service** (link to entity page; title, else name), **Owner** (link to owner entity), **Lifecycle** (text or blank) |
| Order | Displayed name, case-insensitive ascending |
| Paging | 10 rows per page; pager is shown only when there are more than 10 services |
| Footer | `View all` link → `/catalog?filters[kind]=component&filters[type]=service&filters[user]=owned` |
| Loading | `WidgetStatePanel` with "Your services are loading…" |
| Empty | "You don't own any services yet." plus a link to `/catalog` |
| Unavailable | "Your services are currently unavailable." The failure stays inside this widget. |

# Data Model: My Services Homepage Widget

All data is read-only and comes from the existing software catalog and the signed-in identity. Nothing is persisted by this feature.

## Signed-in Identity (source: `identityApiRef.getBackstageIdentity()`)

| Field | Type | Notes |
|-------|------|-------|
| `userEntityRef` | string | e.g. `user:default/jdoe`; `user:development/guest` for guest sign-in |
| `ownershipEntityRefs` | string[] | User ref plus refs of groups the user is a direct member of |

**Rules**: An empty array is treated as "owns nothing" (empty state). It is never sent as an unfiltered query.

## Service (source: catalog `Component` entity, `spec.type: service`)

| Field | Source path | Required | Use |
|-------|-------------|----------|-----|
| ref | `kind` + `metadata.namespace` + `metadata.name` | yes | Row key, link target |
| displayName | `metadata.title` ?? `metadata.name` | yes | Shown name, sort key (case-insensitive) |
| owner | `relations[type=ownedBy].targetRef` (fallback `spec.owner`) | yes | Owner column link |
| lifecycle | `spec.lifecycle` | no | Lifecycle column; blank when absent |

**Validation**: Entities lacking `metadata.name` are dropped. Unknown lifecycle values are shown verbatim.

## Ownership Relationship

A service is "mine" when its `ownedBy` relation targets any ref in `ownershipEntityRefs`. A service owned through several refs (e.g., directly and through a group) appears once, because a single catalog query returns each entity once.

## Widget View State (existing `WidgetDataState<MyService[]>`)

```text
loading ──► ready(services[])        (≥1 owned service)
        ├─► empty(message)           (0 services, or no ownership refs)
        └─► unavailable(message)     (identity or catalog request failed)
```

- `empty` message: "You don't own any services yet." plus a link to the catalog.
- `unavailable` message: "Your services are currently unavailable." (an error detail may be appended).
- Paging is local table state (10 rows per page) and does not trigger a reload.

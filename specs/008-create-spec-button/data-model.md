# Data Model

No persisted data. Runtime view models only.

## CreateSpecAvailability (derived, client-side)
| Field | Type | Source |
|---|---|---|
| `state` | `'checking' \| 'available' \| 'unavailable' \| 'forbidden'` | template lookup + permission checks |
| `reason` | string \| undefined | Explanation text shown when disabled |

Rules:
- `unavailable`: template entity not found or lookup failed.
- `forbidden`: template exists but `taskCreatePermission` or `templateParameterReadPermission` is denied.
- `checking`: lookup/permission pending; button disabled without error text.
- `available`: enabled.
- Independent of the specs list loading/error state.

## CreateSpecLink (derived)
| Field | Value |
|---|---|
| template ref | `template:default/1-speckit-feature` |
| path | `<scaffolder root>/templates/default/1-speckit-feature` |
| `formData` query | JSON: `component` (entity ref, required); `system`, `domain`, `owner` (optional, from the component entity) |

## Entities consumed
- Component `Entity` (from `useEntity`): `kind`, `metadata`, `spec.system`, `spec.owner`.
- Template `Entity` (catalog): existence only.

# Research: Create Spec Button

## 1. Target of the button
- **Decision**: Navigate to the scaffolder selected-template route for `template:default/1-speckit-feature` (`<scaffolder root>/templates/default/1-speckit-feature`).
- **Rationale**: `metadata.name: 1-speckit-feature`, `title: Create feature spec` in [template-spec.yaml](https://github.com/ServerlessOpsIO/backstage-github-speckit-feature/blob/main/template-spec.yaml); no namespace so `default`. That template is already registered in `app-config.production.yaml`.
- **Alternatives**: Link to template list page (extra clicks, violates SC-002); copy template (duplication).

## 2. Pre-selecting the component (FR-005)
- **Decision**: Pass `?formData=<url-encoded JSON>` with `{"component": "<entityRef>"}`.
- **Rationale**: Stock scaffolder feature; the field stays editable. The template's `component` field uses `SoContextualEntityPicker` (`allowArbitraryValues: false`, filtered by `relations.partOf: {{ parameters.system }}`). To keep the picker valid, also prefill `system` and `domain` from the entity's `spec.system` and the system's `partOf` domain when available, plus `owner` from `spec.owner`. Implementation task must verify in a running app that the contextual picker accepts the prefilled values; if it does not, prefill `component` only.
- **Alternatives**: Custom field/state sharing (non-standard, rejected).

## 3. Existing Backstage UI components
- **Decision**: `ContentHeader` (`@backstage/core-components`) places actions top-right; `Button`/`Text` from `@backstage/ui` (already a dependency and used in this plugin) for the action and the explanation; `useNavigate` / scaffolder route ref for navigation (or `href` on the BUI Button). Existing `Progress`, `ResponseErrorPanel`, `EntityTable` stay.
- **Rationale**: User requested stock components; no new styling beyond layout.
- **Alternatives**: MUI `Button` (legacy, mixing), custom header (rejected).

## 4. Availability (FR-006)
- **Decision**: `catalogApi.getEntityByRef('template:default/1-speckit-feature')`; null or error → unavailable. Use `useAsync` as the existing component does.
- **Rationale**: Fails safe; no backend change. While the lookup is pending, button is disabled only if unavailable is known; during lookup show it enabled? Resolved: show disabled until resolved to avoid navigating to a broken page (SC-002 applies once available).
- **Alternatives**: Scaffolder `getTemplateParameterSchema` (heavier, same signal).

## 5. Permission (FR-007)
- **Decision**: `usePermission` with `taskCreatePermission` and `templateParameterReadPermission` (resource ref = template ref) from `@backstage/plugin-scaffolder-common`; denied → disabled with permission explanation. Authorization only informs UX; backend enforcement is unchanged.
- **Rationale**: Same checks the scaffolder uses; no new permissions. Current policy is allow-all, so denial is future-proofing and tested via mocks.
- **Alternatives**: Hide button (conflicts with clarification).

## 6. Loading/error of specs (FR-008)
- **Decision**: Render header+button first; swap only the body between `Progress`, `ResponseErrorPanel`, and table.

## 7. Narrow screens
- **Decision**: `ContentHeader` wraps; verify at mobile viewport in e2e/manual.

No NEEDS CLARIFICATION remain.

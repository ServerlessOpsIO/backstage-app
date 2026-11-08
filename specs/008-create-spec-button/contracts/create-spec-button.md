# UI Contract: "Create spec" button

**Location**: Top-right of the component Specs tab (`/catalog/<ns>/component/<name>/specs`), in a `ContentHeader` action slot, above the specs table.

| State | Button | Visible text | Navigation |
|---|---|---|---|
| available (any specs state: loading, error, empty, populated) | enabled, "Create spec" | none | `/create/templates/default/1-speckit-feature?formData=...` |
| checking | disabled, "Create spec" | none | none |
| unavailable | disabled | Tooltip on hover/focus: The "1-speckit-feature" workflow is unavailable. | none |
| forbidden | disabled | Tooltip on hover/focus: You don't have permission to start the Create feature spec workflow. | none |

**Prefill**: `formData` is URL-encoded JSON, e.g. `{"component":"component:default/my-service"}`; optional `system`, `domain`, `owner`. The user can edit all values in the scaffolder form.

**Target**: Template `metadata.name: 1-speckit-feature`, namespace `default`, from `template-spec.yaml` in `ServerlessOpsIO/backstage-github-speckit-feature`.

**Accessibility**: the explanation is shown in a tooltip on hover/focus of the disabled button.

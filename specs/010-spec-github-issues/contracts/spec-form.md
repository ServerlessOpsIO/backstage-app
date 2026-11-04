# Contract: Spec form and issue body

## Form page (`template-spec.yaml`, first `parameters` page)

```yaml
title: Spec
required: [specType, specTitle, storySentence, proposedSolution]
properties:
  specType:
    title: Spec type
    type: string
    enum: [feature, bug, documentation]
    default: feature
    ui:widget: radio
  specTitle:
    title: Spec title
    type: string
    minLength: 1
  storySentence:
    title: Story sentence
    type: string
    minLength: 1
    description: 'As a ____, I can ____'
  proposedSolution:
    title: Proposed solution
    type: string
    ui:widget: textarea
    ui:options: { rows: 10 }
  additionalContext:
    title: Additional context
    type: string
    ui:widget: textarea
    ui:options: { rows: 5 }
  acceptanceCriteria:
    title: Acceptance criteria
    type: string
    default: '- [ ] ...'
    ui:widget: textarea
    ui:options: { rows: 5 }
```

(`ui:*` keys go in the template's `uiSchema`-style `ui:` entries per Backstage conventions; shown inline for brevity.)

## Issue body (exact layout)

```
<storySentence>

##Proposed Solution
<proposedSolution>

##Additional Context
<additionalContext>

##Acceptance Criteria
<acceptanceCriteria>
```

Title = `specTitle`; labels = `[specType]`.

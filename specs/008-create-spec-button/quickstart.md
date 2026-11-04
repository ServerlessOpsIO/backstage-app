# Quickstart: Validate Create Spec Button

## Prerequisites
- `cd src && yarn install`
- `template-spec.yaml` registered as a catalog location (present in `app-config.production.yaml`; add to your local config to test the available state).
- A component entity that has a Specs tab.

## Automated
```bash
cd src
yarn tsc:full
yarn lint:all
yarn test:all
yarn build:all
```
Unit tests cover: button in all specs states (loading/error/empty/populated), disabled+explanation for unavailable and forbidden, link target and `formData`.

## Manual
1. `cd src && yarn start`, open a component's **Specs** tab.
2. Confirm "Create spec" is at the upper right (also with no specs, and at a narrow viewport).
3. Click it: you land on `/create/templates/default/1-speckit-feature` ("Create feature spec") with the component pre-selected; change it to confirm it is editable.
4. Remove the template location (or point to a missing one): button is disabled with the unavailable message.
5. Use a policy denying `scaffolder.task.create`: button is disabled with the permission message.
6. Make the specs lookup fail (block the catalog request): button stays visible and enabled.

Contract: [contracts/create-spec-button.md](./contracts/create-spec-button.md)

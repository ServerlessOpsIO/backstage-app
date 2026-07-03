import { CatalogIndexPageEntityList } from './CatalogIndexPageEntityList'
import {
  EntityKindPicker,
  EntityTypePicker,
  EntityOwnerPicker,
  EntityProcessingStatusPicker,
  UserListPicker,
} from '@backstage/plugin-catalog-react';

export function LocationCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      filters={
        <>
          <EntityKindPicker
            initialFilter='location'
            hidden
          />
          <EntityTypePicker />
          <UserListPicker
            initialFilter='all'
          />
          <EntityOwnerPicker />
          <EntityProcessingStatusPicker />
        </>
      }
      initialKind="location"
      initiallySelectedFilter="all"
    />
  )
}
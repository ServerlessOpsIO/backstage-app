import { CatalogIndexPageEntityList } from './CatalogIndexPageEntityList'
import {
  EntityKindPicker,
  EntityTypePicker,
} from '@backstage/plugin-catalog-react';
import React from 'react';

export function GroupCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      filters={
        <>
          <EntityKindPicker
            initialFilter='group'
            hidden={true}
          />
          <EntityTypePicker />
        </>
      }
      initialKind="group"
      initiallySelectedFilter="all"
    />
  )
}
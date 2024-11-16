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
            hidden
          />
          <EntityTypePicker />
        </>
      }
      initialKind="group"
      initiallySelectedFilter="all"
    />
  )
}
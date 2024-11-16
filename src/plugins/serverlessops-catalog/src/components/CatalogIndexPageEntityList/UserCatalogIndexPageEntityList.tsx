import { CatalogIndexPageEntityList } from './CatalogIndexPageEntityList'
import {
  EntityKindPicker,
} from '@backstage/plugin-catalog-react';
import React from 'react';

export function UserCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      filters={
        <>
          <EntityKindPicker
            initialFilter='user'
            hidden
          />
        </>
      }
      initialKind="user"
      initiallySelectedFilter="all"
    />
  )
}
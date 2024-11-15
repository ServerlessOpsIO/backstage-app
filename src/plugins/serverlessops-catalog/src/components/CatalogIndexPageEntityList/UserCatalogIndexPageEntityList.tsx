import { CatalogIndexPageEntityList } from './CatalogIndexPageEntityList'
import React from 'react';

export function UserCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      initialKind="user"
      initiallySelectedFilter="all"
    />
  )
}
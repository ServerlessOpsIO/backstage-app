import { CatalogIndexPageEntityList } from './CatalogIndexPageEntityList'
import React from 'react';

export function GroupCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      initialKind="group"
      initiallySelectedFilter="all"
    />
  )
}
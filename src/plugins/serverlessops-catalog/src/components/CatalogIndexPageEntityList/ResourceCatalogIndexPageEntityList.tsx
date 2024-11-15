import { CatalogIndexPageEntityList } from './CatalogIndexPageEntityList'
import React from 'react';

export function ResourceCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      initialKind="resource"
      initiallySelectedFilter="all"
    />
  )
}
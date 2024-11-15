import { CatalogIndexPageEntityList } from './CatalogIndexPageEntityList'
import React from 'react';

export function LocationCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      initialKind="location"
      initiallySelectedFilter="all"
    />
  )
}
import { CatalogIndexPageEntityList } from './CatalogIndexPageEntityList'
import React from 'react';

export function ApiCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      initialKind="api"
      initiallySelectedFilter="all"
    />
  )
}
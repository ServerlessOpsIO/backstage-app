import { CatalogIndexPageEntityList } from './CatalogIndexPageEntityList'
import React from 'react';

export function SystemCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      initialKind="system"
      initiallySelectedFilter="all"
    />
  )
}
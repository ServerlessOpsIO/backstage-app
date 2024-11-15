import { CatalogIndexPageEntityList } from './CatalogIndexPageEntityList'
import React from 'react';

export function DomainCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      initialKind="domain"
      initiallySelectedFilter="all"
    />
  )
}
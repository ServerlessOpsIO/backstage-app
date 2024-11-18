import React from 'react';
import { TableColumn } from '@backstage/core-components';
import {
  EntityKindPicker,
  EntityTypePicker,
  EntityOwnerPicker,
  EntityProcessingStatusPicker,
  UserListPicker,
} from '@backstage/plugin-catalog-react';
import { CatalogTableRow } from '@backstage/plugin-catalog'
import { CatalogIndexPageEntityList } from './CatalogIndexPageEntityList'
import { columnFactories } from '../CatalogIndexColumns/columns'


const defaultColumns: TableColumn<CatalogTableRow>[] = [
  columnFactories.createTitleColumn({ hidden: true }),
  columnFactories.createNameColumn({ defaultKind: 'System', width: '25%' }),
  // FIXME: Does not currently exist
  // columnFactories.createDomainColumn({ width: 'auto' }),
  columnFactories.createMetadataDescriptionColumn({ width: 'auto' }),
]
export function SystemCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      filters={
        <>
          <EntityKindPicker
            initialFilter='system'
            hidden
          />
          <EntityTypePicker />
          <UserListPicker
            initialFilter='all'
          />
          <EntityOwnerPicker />
          <EntityProcessingStatusPicker />
        </>
      }
      initialKind="system"
      initiallySelectedFilter="all"
      columns={defaultColumns}
    />
  )
}
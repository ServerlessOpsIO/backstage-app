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
  columnFactories.createNameColumn({ defaultKind: 'Resource', width: '25%' }),
  columnFactories.createSystemColumn({ width: 'auto' }),
  columnFactories.createSpecTypeColumn({ width: 'auto' }),
  columnFactories.createMetadataDescriptionColumn({ width: 'auto' }),
]

export function ResourceCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      filters={
        <>
          <EntityKindPicker
            initialFilter='resource'
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
      initialKind="resource"
      initiallySelectedFilter="all"
      columns={defaultColumns}
    />
  )
}
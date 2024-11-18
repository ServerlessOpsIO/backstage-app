import React from 'react';
import { TableColumn } from '@backstage/core-components';
import { CatalogTableRow } from '@backstage/plugin-catalog'
import {
  EntityKindPicker,
  EntityTypePicker,
  EntityOwnerPicker,
  EntityProcessingStatusPicker,
  UserListPicker,
} from '@backstage/plugin-catalog-react';
import { CatalogIndexPageEntityList } from './CatalogIndexPageEntityList'
import { columnFactories } from '../CatalogIndexColumns/columns'

const defaultColumns: TableColumn<CatalogTableRow>[] = [
  columnFactories.createTitleColumn({ hidden: true }),
  columnFactories.createNameColumn({ defaultKind: 'Component', width: '25%' }),
  columnFactories.createSystemColumn({ width: 'auto' }),
  columnFactories.createSpecTypeColumn({ width: 'auto' }),
  columnFactories.createMetadataDescriptionColumn({ width: 'auto' }),
]

export function ComponentCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      filters={
        <>
          <EntityKindPicker
            initialFilter='component'
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
      initialKind="component"
      initiallySelectedFilter="all"
      columns={defaultColumns}
    />
  )
}
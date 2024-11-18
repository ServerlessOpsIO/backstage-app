import React from 'react';
import { TableColumn } from '@backstage/core-components';
import {
  EntityKindPicker,
  EntityTypePicker,
} from '@backstage/plugin-catalog-react';
import { CatalogTableRow } from '@backstage/plugin-catalog'
import { CatalogIndexPageEntityList } from './CatalogIndexPageEntityList'
import { columnFactories } from '../CatalogIndexColumns/columns'

const defaultColumns: TableColumn<CatalogTableRow>[] = [
  columnFactories.createTitleColumn({ hidden: true }),
  columnFactories.createNameColumn({ defaultKind: 'Group', width: '20%' }),
  columnFactories.createSpecTypeColumn({ width: 'auto' }),
  columnFactories.createMetadataDescriptionColumn({ width: 'auto' }),
]
export function GroupCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      filters={
        <>
          <EntityKindPicker
            initialFilter='group'
            hidden
          />
          <EntityTypePicker />
        </>
      }
      initialKind="group"
      initiallySelectedFilter="all"
      columns={defaultColumns}
    />
  )
}
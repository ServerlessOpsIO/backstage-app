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
  columnFactories.createNameColumn({ defaultKind: 'Domain', width: '20%' }),
  columnFactories.createMetadataDescriptionColumn({width: 'auto'}),
]

export function DomainCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      filters={
        <>
          <EntityKindPicker
            initialFilter='domain'
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
      initialKind="domain"
      initiallySelectedFilter="all"
      columns={defaultColumns}
    />
  )
}
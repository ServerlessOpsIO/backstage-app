import { TableColumn } from '@backstage/core-components';
import {
  EntityKindPicker,
} from '@backstage/plugin-catalog-react';
import { CatalogTableRow } from '@backstage/plugin-catalog'
import { CatalogIndexPageEntityList } from './CatalogIndexPageEntityList'
import { columnFactories } from '../CatalogIndexColumns/columns'

const defaultColumns: TableColumn<CatalogTableRow>[] = [
  columnFactories.createTitleColumn({ hidden: true }),
  columnFactories.createNameColumn({ defaultKind: 'User', width: '20%' }),
  columnFactories.createUsernameColumn({width: 'auto'}),
  columnFactories.createSpecEmailColumn({width: 'auto'}),
]
export function UserCatalogIndexPageEntityList() {
  return (
    <CatalogIndexPageEntityList
      filters={
        <>
          <EntityKindPicker
            initialFilter='user'
            hidden
          />
        </>
      }
      initialKind="user"
      initiallySelectedFilter="all"
      columns={defaultColumns}
    />
  )
}
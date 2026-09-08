import {
  TableColumn,
  TableProps,
} from '@backstage/core-components';
import {
  CatalogTable,
  CatalogTableRow,
  CatalogTableColumnsFunc,
} from '@backstage/plugin-catalog';
import {
  CatalogFilterLayout,
  DefaultFilters,
  EntityListPagination,
  EntityListProvider,
  EntityOwnerPickerProps,
  UserListFilterKind,
} from '@backstage/plugin-catalog-react';
import { ReactNode } from 'react';

/** @internal */
export type DefaultCatalogIndexPageEntityListProps = {
  filters: ReactNode;
  content?: ReactNode;
  pagination?: EntityListPagination;
};


function DefaultCatalogIndexPageEntityList(props: DefaultCatalogIndexPageEntityListProps) {
  const { filters, content = <CatalogTable />, pagination } = props;

  return (
    <EntityListProvider pagination={pagination}>
      <CatalogFilterLayout>
        <CatalogFilterLayout.Filters>{filters}</CatalogFilterLayout.Filters>
        <CatalogFilterLayout.Content>{content}</CatalogFilterLayout.Content>
      </CatalogFilterLayout>
    </EntityListProvider>
  );
}

/**
 * Props for root catalog pages.
 *
 * @public
 */
export interface CatalogIndexPageEntityListProps {
  initiallySelectedFilter?: UserListFilterKind;
  columns?: TableColumn<CatalogTableRow>[] | CatalogTableColumnsFunc;
  actions?: TableProps<CatalogTableRow>['actions'];
  initialKind?: string;
  tableOptions?: TableProps<CatalogTableRow>['options'];
  emptyContent?: ReactNode;
  ownerPickerMode?: EntityOwnerPickerProps['mode'];
  filters?: ReactNode;
  initiallySelectedNamespaces?: string[];
  pagination?: EntityListPagination;
}

export function CatalogIndexPageEntityList(props: CatalogIndexPageEntityListProps) {
  const {
    columns,
    actions,
    initiallySelectedFilter = 'owned',
    initialKind = 'component',
    tableOptions = {},
    emptyContent,
    pagination,
    ownerPickerMode,
    filters,
    initiallySelectedNamespaces,
  } = props;

  return (
    <DefaultCatalogIndexPageEntityList
      filters={
        filters ?? (
          <DefaultFilters
            initialKind={initialKind}
            initiallySelectedFilter={initiallySelectedFilter}
            ownerPickerMode={ownerPickerMode}
            initiallySelectedNamespaces={initiallySelectedNamespaces}
          />
        )
      }
      content={
        <CatalogTable
          columns={columns}
          actions={actions}
          tableOptions={tableOptions}
          emptyContent={emptyContent}
        />
      }
      pagination={pagination}
    />
  );
}

import { InfoCard, Link, Table, TableColumn } from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import { catalogApiRef, EntityRefLink } from '@backstage/plugin-catalog-react';
import { RendererProps } from '@backstage/plugin-home-react';
import { useEffect, useState } from 'react';
import { MySystem, toMySystems } from '../models/my-systems';
import { WidgetDataState } from '../models/widget-data-state';
import { WidgetStatePanel } from './widget-state-panel';

const PAGE_SIZE = 10;
const VIEW_ALL_PATH = '/catalog?filters[kind]=system&filters[user]=owned';

const columns: TableColumn<MySystem>[] = [
  {
    title: 'System',
    field: 'displayName',
    highlight: true,
    render: system => (
      <EntityRefLink entityRef={system.ref}>{system.displayName}</EntityRefLink>
    ),
  },
  {
    title: 'Owner',
    field: 'owner',
    render: system =>
      system.owner ? (
        <EntityRefLink entityRef={system.owner} defaultKind="group" />
      ) : null,
  },
];

export function MySystemsWidgetRenderer({ title, Content }: RendererProps) {
  return (
    <InfoCard title={title} divider noPadding>
      <Content />
    </InfoCard>
  );
}

export function MySystemsWidget() {
  const catalogApi = useApi(catalogApiRef);
  const identityApi = useApi(identityApiRef);
  const [state, setState] = useState<WidgetDataState<MySystem[]>>({
    status: 'loading',
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    const load = async () => {
      const { ownershipEntityRefs } = await identityApi.getBackstageIdentity();
      if (!ownershipEntityRefs?.length) {
        return [];
      }
      const { items } = await catalogApi.getEntities({
        filter: {
          kind: 'system',
          'relations.ownedBy': ownershipEntityRefs,
        },
        fields: [
          'kind',
          'metadata.namespace',
          'metadata.name',
          'metadata.title',
          'spec.owner',
          'relations',
        ],
      });
      return toMySystems(items, ownershipEntityRefs);
    };
    load()
      .then(systems => {
        if (!cancelled) {
          setState(
            systems.length
              ? { status: 'ready', data: systems }
              : { status: 'empty', message: "You don't own any systems yet." },
          );
        }
      })
      .catch(error => {
        if (!cancelled) {
          setState({
            status: 'unavailable',
            message: `Your systems are currently unavailable.${
              error instanceof Error && error.message
                ? ` ${error.message}`
                : ''
            }`,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [catalogApi, identityApi]);

  if (state.status === 'empty') {
    return (
      <div style={{ padding: '0.75rem 0.25rem' }} role="status">
        {state.message} <Link to="/catalog">Browse the catalog</Link>
      </div>
    );
  }
  if (state.status !== 'ready') {
    return (
      <WidgetStatePanel
        state={state}
        loadingMessage="Your systems are loading…"
      />
    );
  }
  return (
    <>
      <Table
        columns={columns}
        data={state.data}
        components={{ Container: props => <div {...props} /> }}
        options={{
          paging: state.data.length > PAGE_SIZE,
          pageSize: PAGE_SIZE,
          pageSizeOptions: [PAGE_SIZE],
          emptyRowsWhenPaging: false,
          search: false,
          toolbar: false,
          sorting: false,
          padding: 'dense',
        }}
      />
      <div style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>
        <Link to={VIEW_ALL_PATH}>View all</Link>
      </div>
    </>
  );
}

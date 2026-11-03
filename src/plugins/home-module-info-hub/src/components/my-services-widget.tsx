import { InfoCard, Link, Table, TableColumn } from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import { catalogApiRef, EntityRefLink } from '@backstage/plugin-catalog-react';
import { RendererProps } from '@backstage/plugin-home-react';
import { useEffect, useState } from 'react';
import { MyService, toMyServices } from '../models/my-services';
import { WidgetDataState } from '../models/widget-data-state';
import { WidgetStatePanel } from './widget-state-panel';

const PAGE_SIZE = 10;
const VIEW_ALL_PATH =
  '/catalog?filters[kind]=component&filters[type]=service&filters[user]=owned';

const columns: TableColumn<MyService>[] = [
  {
    title: 'Service',
    field: 'displayName',
    highlight: true,
    render: service => (
      <EntityRefLink entityRef={service.ref}>{service.displayName}</EntityRefLink>
    ),
  },
  {
    title: 'Owner',
    field: 'owner',
    render: service =>
      service.owner ? (
        <EntityRefLink entityRef={service.owner} defaultKind="group" />
      ) : null,
  },
  {
    title: 'Lifecycle',
    field: 'lifecycle',
    width: '120px',
    render: service => service.lifecycle ?? '',
  },
];

export function MyServicesWidgetRenderer({ title, Content }: RendererProps) {
  return (
    <InfoCard title={title} divider noPadding>
      <Content />
    </InfoCard>
  );
}

export function MyServicesWidget() {
  const catalogApi = useApi(catalogApiRef);
  const identityApi = useApi(identityApiRef);
  const [state, setState] = useState<WidgetDataState<MyService[]>>({
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
          kind: 'component',
          'spec.type': 'service',
          'relations.ownedBy': ownershipEntityRefs,
        },
        fields: [
          'kind',
          'metadata.namespace',
          'metadata.name',
          'metadata.title',
          'spec.lifecycle',
          'spec.owner',
          'relations',
        ],
      });
      return toMyServices(items, ownershipEntityRefs);
    };
    load()
      .then(services => {
        if (!cancelled) {
          setState(
            services.length
              ? { status: 'ready', data: services }
              : { status: 'empty', message: "You don't own any services yet." },
          );
        }
      })
      .catch(error => {
        if (!cancelled) {
          setState({
            status: 'unavailable',
            message: `Your services are currently unavailable.${
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
        loadingMessage="Your services are loading…"
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

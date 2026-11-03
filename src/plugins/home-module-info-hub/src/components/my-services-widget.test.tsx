import { fireEvent, screen, within } from '@testing-library/react';
import { renderInTestApp } from '@backstage/frontend-test-utils';
import { identityApiRef } from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  entityRouteRef,
} from '@backstage/plugin-catalog-react';
import {
  MyServicesWidget,
  MyServicesWidgetRenderer,
} from './my-services-widget';

type TestEntity = {
  kind: string;
  metadata: { name?: string; namespace?: string; title?: string };
  spec?: { type?: string; owner?: string; lifecycle?: string };
  relations?: { type: string; targetRef: string }[];
};

function service(
  name: string,
  owner: string,
  extra: Partial<TestEntity['metadata']> = {},
  lifecycle: string | null = 'production',
): TestEntity {
  return {
    kind: 'Component',
    metadata: { name, namespace: 'default', ...extra },
    spec: { type: 'service', owner, lifecycle: lifecycle ?? undefined },
    relations: [{ type: 'ownedBy', targetRef: owner }],
  };
}

// Mimics the catalog's filter semantics so exclusion is exercised end to end.
function filteringGetEntities(entities: TestEntity[]) {
  return jest.fn(
    async ({ filter }: { filter: Record<string, string | string[]> }): Promise<any> => ({
      items: entities.filter(
        entity =>
          entity.kind.toLowerCase() === filter.kind &&
          entity.spec?.type === filter['spec.type'] &&
          (entity.relations ?? []).some(
            relation =>
              relation.type === 'ownedBy' &&
              (filter['relations.ownedBy'] as string[]).includes(
                relation.targetRef,
              ),
          ),
      ),
    }),
  );
}

function render({
  entities = [],
  ownershipEntityRefs = ['user:default/jdoe', 'group:default/team-a'],
  getEntities,
  getBackstageIdentity,
}: {
  entities?: TestEntity[];
  ownershipEntityRefs?: string[];
  getEntities?: jest.Mock;
  getBackstageIdentity?: jest.Mock;
} = {}) {
  const catalog = {
    getEntities: getEntities ?? filteringGetEntities(entities),
  };
  const identity = {
    getBackstageIdentity:
      getBackstageIdentity ??
      jest.fn().mockResolvedValue({
        type: 'user',
        userEntityRef: 'user:default/jdoe',
        ownershipEntityRefs,
      }),
  };
  renderInTestApp(
    <MyServicesWidgetRenderer title="My Services" Content={MyServicesWidget} />,
    {
      apis: [
        [catalogApiRef, catalog],
        [identityApiRef, identity],
      ],
      mountedRoutes: {
        // The catalog's legacy route ref is accepted at runtime but typed as the old API.
        '/catalog/:namespace/:kind/:name': entityRouteRef as never,
      },
    },
  );
  return { catalog, identity };
}

describe('MyServicesWidget', () => {
  test('queries owned services for the user and their groups', async () => {
    const { catalog } = render({
      entities: [
        service('direct-svc', 'user:default/jdoe'),
        service('group-svc', 'group:default/team-a'),
      ],
    });

    expect(await screen.findByText('direct-svc')).toBeVisible();
    expect(screen.getByText('group-svc')).toBeVisible();
    expect(catalog.getEntities).toHaveBeenCalledTimes(1);
    expect(catalog.getEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          kind: 'component',
          'spec.type': 'service',
          'relations.ownedBy': ['user:default/jdoe', 'group:default/team-a'],
        },
      }),
    );
  });

  test('excludes unrelated services and non-service components', async () => {
    render({
      entities: [
        service('mine', 'user:default/jdoe'),
        service('other-team', 'group:default/team-b'),
        {
          ...service('a-library', 'user:default/jdoe'),
          spec: { type: 'library', owner: 'user:default/jdoe' },
        },
      ],
    });

    expect(await screen.findByText('mine')).toBeVisible();
    expect(screen.queryByText('other-team')).not.toBeInTheDocument();
    expect(screen.queryByText('a-library')).not.toBeInTheDocument();
  });

  test('lists a service once even when it is returned twice', async () => {
    render({
      entities: [
        service('shared', 'group:default/team-a'),
        service('shared', 'group:default/team-a'),
      ],
    });

    expect(await screen.findAllByText('shared')).toHaveLength(1);
  });

  test('sorts by display name case-insensitively and falls back to name', async () => {
    render({
      entities: [
        service('zeta', 'user:default/jdoe'),
        service('alpha-id', 'user:default/jdoe', { title: 'Bravo' }),
        service('charlie', 'user:default/jdoe'),
        service('apple', 'user:default/jdoe', { title: 'alpha' }),
        { ...service('', 'user:default/jdoe'), metadata: {} },
      ],
    });

    await screen.findByText('Bravo');
    const [table] = screen.getAllByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(
      rows.map(row => within(row).getAllByRole('cell')[0].textContent),
    ).toEqual(['alpha', 'Bravo', 'charlie', 'zeta']);
  });

  test('links each service to its catalog entity page', async () => {
    render({ entities: [service('payments', 'user:default/jdoe')] });

    expect(
      await screen.findByRole('link', { name: 'payments' }),
    ).toHaveAttribute('href', '/catalog/default/component/payments');
  });

  test('shows the empty state without querying when there are no ownership refs', async () => {
    const { catalog } = render({ ownershipEntityRefs: [] });

    expect(
      await screen.findByText("You don't own any services yet."),
    ).toBeVisible();
    expect(catalog.getEntities).not.toHaveBeenCalled();
  });

  test('shows the empty state when no services are owned', async () => {
    render({ entities: [] });

    expect(
      await screen.findByText("You don't own any services yet."),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Browse the catalog' })).toHaveAttribute(
      'href',
      '/catalog',
    );
  });

  test('shows a loading state while the request is pending', async () => {
    render({ getEntities: jest.fn(() => new Promise(() => {})) });

    expect(await screen.findByText('Your services are loading…')).toBeVisible();
  });

  test('shows an unavailable state when the catalog request fails', async () => {
    render({ getEntities: jest.fn().mockRejectedValue(new Error('boom')) });

    expect(
      await screen.findByText(/Your services are currently unavailable\./),
    ).toBeVisible();
  });

  test('shows an unavailable state when the identity lookup fails', async () => {
    render({
      getBackstageIdentity: jest.fn().mockRejectedValue(new Error('no id')),
    });

    expect(
      await screen.findByText(/Your services are currently unavailable\./),
    ).toBeVisible();
  });

  test('shows the linked owner and lifecycle for each service', async () => {
    render({
      entities: [
        service('direct-svc', 'user:default/jdoe', {}, 'experimental'),
        service('group-svc', 'group:default/team-a', {}, 'production'),
      ],
    });

    await screen.findByText('direct-svc');
    const [table] = screen.getAllByRole('table');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map(header => header.textContent),
    ).toEqual(['Service', 'Owner', 'Lifecycle']);

    const [direct, group] = within(table).getAllByRole('row').slice(1);
    expect(within(direct).getByText('experimental')).toBeVisible();
    expect(within(group).getByText('production')).toBeVisible();
    expect(within(group).getByRole('link', { name: /team-a/ })).toHaveAttribute(
      'href',
      '/catalog/default/group/team-a',
    );
    expect(within(direct).getByRole('link', { name: /jdoe/ })).toHaveAttribute(
      'href',
      '/catalog/default/user/jdoe',
    );
  });

  test('still lists a service whose lifecycle is missing', async () => {
    render({
      entities: [service('no-lifecycle', 'user:default/jdoe', {}, null)],
    });

    expect(await screen.findByText('no-lifecycle')).toBeVisible();
    const [table] = screen.getAllByRole('table');
    const [row] = within(table).getAllByRole('row').slice(1);
    expect(within(row).getAllByRole('cell')[2]).toBeEmptyDOMElement();
  });

  describe('with many services', () => {
    const many = Array.from({ length: 13 }, (_, index) =>
      service(`svc-${String(index + 1).padStart(2, '0')}`, 'user:default/jdoe'),
    );

    function bodyRows() {
      const [table] = screen.getAllByRole('table');
      return within(table).getAllByRole('row').slice(1);
    }

    test('pages through 13 services as 10 then 3 rows', async () => {
      const { catalog } = render({ entities: [...many].reverse() });

      expect(await screen.findByText('svc-01')).toBeVisible();
      expect(bodyRows()).toHaveLength(10);
      expect(screen.queryByText('svc-11')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /next page/i }));

      expect(await screen.findByText('svc-11')).toBeVisible();
      expect(bodyRows()).toHaveLength(3);
      expect(screen.queryByText('svc-01')).not.toBeInTheDocument();
      expect(catalog.getEntities).toHaveBeenCalledTimes(1);
    });

    test('hides the pager when there are 10 or fewer services', async () => {
      render({ entities: many.slice(0, 10) });

      expect(await screen.findByText('svc-10')).toBeVisible();
      expect(
        screen.queryByRole('button', { name: /next page/i }),
      ).not.toBeInTheDocument();
    });
  });

  test('links "View all" to the catalog owned service filters', async () => {
    render({ entities: [service('payments', 'user:default/jdoe')] });

    expect(await screen.findByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/catalog?filters[kind]=component&filters[type]=service&filters[user]=owned',
    );
  });
});

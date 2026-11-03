import { fireEvent, screen, within } from '@testing-library/react';
import { renderInTestApp } from '@backstage/frontend-test-utils';
import { identityApiRef } from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  entityRouteRef,
} from '@backstage/plugin-catalog-react';
import {
  MySystemsWidget,
  MySystemsWidgetRenderer,
} from './my-systems-widget';

type TestEntity = {
  apiVersion: string;
  kind: string;
  metadata: { name: string; namespace?: string; title?: string };
  spec?: { owner?: string };
  relations?: { type: string; targetRef: string }[];
};

function system(
  name: string,
  owner: string,
  extra: Partial<TestEntity['metadata']> = {},
): TestEntity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'System',
    metadata: { name, namespace: 'default', ...extra },
    spec: { owner },
    relations: [{ type: 'ownedBy', targetRef: owner }],
  };
}

function filteringGetEntities(entities: TestEntity[]) {
  return jest.fn(
    async ({ filter }: { filter: Record<string, string | string[]> }) => ({
      items: entities.filter(
        entity =>
          entity.kind.toLowerCase() === filter.kind &&
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
    <MySystemsWidgetRenderer title="My Systems" Content={MySystemsWidget} />,
    {
      apis: [
        [catalogApiRef, catalog],
        [identityApiRef, identity],
      ],
      mountedRoutes: {
        '/catalog/:namespace/:kind/:name': entityRouteRef as never,
      },
    },
  );
  return { catalog, identity };
}

describe('MySystemsWidget', () => {
  test('queries systems owned by the user or their groups', async () => {
    const { catalog } = render({
      entities: [
        system('direct-system', 'user:default/jdoe'),
        system('group-system', 'group:default/team-a'),
      ],
    });

    expect(await screen.findByText('direct-system')).toBeVisible();
    expect(screen.getByText('group-system')).toBeVisible();
    expect(catalog.getEntities).toHaveBeenCalledTimes(1);
    expect(catalog.getEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          kind: 'system',
          'relations.ownedBy': ['user:default/jdoe', 'group:default/team-a'],
        },
      }),
    );
  });

  test('excludes systems owned by others and deduplicates results', async () => {
    render({
      entities: [
        system('mine', 'user:default/jdoe'),
        system('other-team', 'group:default/team-b'),
        system('mine', 'user:default/jdoe'),
      ],
    });

    expect(await screen.findAllByText('mine')).toHaveLength(1);
    expect(screen.queryByText('other-team')).not.toBeInTheDocument();
  });

  test('sorts by title and links systems and owners to catalog pages', async () => {
    render({
      entities: [
        system('zeta', 'user:default/jdoe'),
        system('alpha-id', 'group:default/team-a', { title: 'Alpha' }),
      ],
    });

    expect(
      await screen.findByRole('link', { name: 'Alpha' }),
    ).toHaveAttribute('href', '/catalog/default/system/alpha-id');
    expect(screen.getByRole('link', { name: 'zeta' })).toHaveAttribute(
      'href',
      '/catalog/default/system/zeta',
    );

    const [table] = screen.getAllByRole('table');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map(header => header.textContent),
    ).toEqual(['System', 'Owner']);
    const [alpha] = within(table).getAllByRole('row').slice(1);
    expect(within(alpha).getByRole('link', { name: /team-a/ })).toHaveAttribute(
      'href',
      '/catalog/default/group/team-a',
    );
  });

  test('does not query when there are no ownership refs and shows empty state', async () => {
    const { catalog } = render({ ownershipEntityRefs: [] });

    expect(
      await screen.findByText("You don't own any systems yet."),
    ).toBeVisible();
    expect(catalog.getEntities).not.toHaveBeenCalled();
  });

  test('shows an empty state and links to the catalog when no systems are owned', async () => {
    render({ entities: [] });

    expect(
      await screen.findByText("You don't own any systems yet."),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Browse the catalog' }),
    ).toHaveAttribute('href', '/catalog');
  });

  test('shows loading and unavailable states', async () => {
    render({ getEntities: jest.fn(() => new Promise(() => {})) });
    expect(await screen.findByText('Your systems are loading…')).toBeVisible();
  });

  test('shows an unavailable state when the catalog request fails', async () => {
    render({ getEntities: jest.fn().mockRejectedValue(new Error('boom')) });

    expect(
      await screen.findByText(/Your systems are currently unavailable\./),
    ).toBeVisible();
  });

  test('links View all to owned systems in the catalog', async () => {
    render({ entities: [system('payments', 'user:default/jdoe')] });

    expect(await screen.findByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/catalog?filters[kind]=system&filters[user]=owned',
    );
  });

  test('pages through more than ten systems', async () => {
    const systems = Array.from({ length: 11 }, (_, index) =>
      system(`system-${String(index + 1).padStart(2, '0')}`, 'user:default/jdoe'),
    );
    render({ entities: systems });

    expect(await screen.findByText('system-01')).toBeVisible();
    const [table] = screen.getAllByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(await screen.findByText('system-11')).toBeVisible();
    expect(within(table).getAllByRole('row')).toHaveLength(2);
  });
});

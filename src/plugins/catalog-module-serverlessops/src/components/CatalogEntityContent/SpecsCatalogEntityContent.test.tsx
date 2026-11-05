import { screen } from '@testing-library/react'
import { renderInTestApp } from '@backstage/frontend-test-utils'
import {
  catalogApiRef,
  entityRouteRef,
  EntityProvider,
} from '@backstage/plugin-catalog-react'
import scaffolderPlugin from '@backstage/plugin-scaffolder/alpha'
import { usePermission } from '@backstage/plugin-permission-react'
import { SpecsCatalogEntityContent } from './SpecsCatalogEntityContent'

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn(),
}))

const component = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'my-service', namespace: 'default' },
  spec: { type: 'service', owner: 'group:default/team-a' },
}

const template = {
  apiVersion: 'scaffolder.backstage.io/v1beta3',
  kind: 'Template',
  metadata: { name: '1-speckit-feature', namespace: 'default' },
}

const spec = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Resource',
  metadata: { name: 'spec-one', namespace: 'default', title: '001 First' },
  spec: { type: 'doc-spec', owner: 'group:default/team-a' },
}

function render(getEntities: jest.Mock) {
  return renderInTestApp(
    <EntityProvider entity={component}>
      <SpecsCatalogEntityContent />
    </EntityProvider>,
    {
      apis: [
        [
          catalogApiRef,
          {
            getEntities,
            getEntityByRef: jest.fn().mockResolvedValue(template),
          },
        ],
      ],
      mountedRoutes: {
        '/create': scaffolderPlugin.routes.root as never,
        '/catalog/:namespace/:kind/:name': entityRouteRef as never,
      },
    },
  )
}

describe('SpecsCatalogEntityContent', () => {
  beforeEach(() => {
    ;(usePermission as jest.Mock).mockReturnValue({
      loading: false,
      allowed: true,
    })
  })

  test('shows the create button while specs are loading', async () => {
    render(jest.fn(() => new Promise(() => {})))

    expect(
      await screen.findByRole('link', { name: 'Create spec' }),
    ).toBeVisible()
  })

  test('shows the create button when the specs lookup fails', async () => {
    render(jest.fn().mockRejectedValue(new Error('boom')))

    expect(
      await screen.findByRole('link', { name: 'Create spec' }),
    ).toBeVisible()
  })

  test('shows the create button with no specs', async () => {
    render(jest.fn().mockResolvedValue({ items: [] }))

    expect(
      await screen.findByRole('link', { name: 'Create spec' }),
    ).toBeVisible()
    expect(await screen.findByText(/No specs for this component yet/)).toBeVisible()
  })

  test('shows the create button with specs', async () => {
    render(jest.fn().mockResolvedValue({ items: [spec] }))

    expect(
      await screen.findByRole('link', { name: 'Create spec' }),
    ).toBeVisible()
    expect(await screen.findByText('001 First')).toBeVisible()
  })
})

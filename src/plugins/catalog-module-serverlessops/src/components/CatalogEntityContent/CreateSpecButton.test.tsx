import { screen, waitFor } from '@testing-library/react'
import { renderInTestApp } from '@backstage/frontend-test-utils'
import { catalogApiRef, EntityProvider } from '@backstage/plugin-catalog-react'
import scaffolderPlugin from '@backstage/plugin-scaffolder/alpha'
import { usePermission } from '@backstage/plugin-permission-react'
import { CreateSpecButton } from './CreateSpecButton'

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn(),
}))

const mockUsePermission = usePermission as jest.Mock

const template = {
  apiVersion: 'scaffolder.backstage.io/v1beta3',
  kind: 'Template',
  metadata: { name: '1-speckit-feature', namespace: 'default' },
}

const component = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'my-service', namespace: 'default' },
  spec: {
    type: 'service',
    owner: 'group:default/team-a',
    system: 'my-system',
  },
}

const bareComponent = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'bare', namespace: 'default' },
  spec: { type: 'service' },
}

const system = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'System',
  metadata: { name: 'my-system', namespace: 'default' },
  relations: [{ type: 'partOf', targetRef: 'domain:default/my-domain' }],
}

const formData = (link: HTMLElement) =>
  JSON.parse(
    decodeURIComponent(link.getAttribute('href')!.split('?formData=')[1]),
  )

const allowed = { loading: false, allowed: true }

function render({
  getEntityByRef = jest.fn(async (ref: string) =>
    ref.startsWith('system:') ? system : template,
  ),
  entity = component,
}: { getEntityByRef?: jest.Mock; entity?: object } = {}) {
  return renderInTestApp(
    <EntityProvider entity={entity as never}>
      <CreateSpecButton />
    </EntityProvider>,
    {
      apis: [[catalogApiRef, { getEntityByRef }]],
      mountedRoutes: { '/create': scaffolderPlugin.routes.root as never },
    },
  )
}

describe('CreateSpecButton', () => {
  beforeEach(() => {
    mockUsePermission.mockReturnValue(allowed)
  })

  test('links to the scaffolder template when available', async () => {
    render()

    const link = await screen.findByRole('link', { name: 'Create spec' })
    expect(link.getAttribute('href')).toMatch(
      /^\/create\/templates\/default\/1-speckit-feature\?formData=/,
    )
  })

  test('prefills the component, system, owner and domain', async () => {
    render()

    const link = await screen.findByRole('link', { name: 'Create spec' })
    await waitFor(() => expect(formData(link)).toHaveProperty('domain'))
    expect(formData(link)).toEqual({
      component: 'component:default/my-service',
      system: 'system:default/my-system',
      owner: 'group:default/team-a',
      domain: 'domain:default/my-domain',
    })
  })

  test('omits optional values the entity does not have', async () => {
    render({ entity: bareComponent })

    const link = await screen.findByRole('link', { name: 'Create spec' })
    expect(formData(link)).toEqual({ component: 'component:default/bare' })
  })

  test('is disabled without text while checking', async () => {
    render({ getEntityByRef: jest.fn(() => new Promise(() => {})) })

    const button = await screen.findByRole('button', { name: 'Create spec' })
    expect(button).toBeDisabled()
    expect(screen.queryByText(/unavailable|permission/)).toBeNull()
  })

  test('is disabled with an explanation when the template is missing', async () => {
    render({ getEntityByRef: jest.fn().mockResolvedValue(undefined) })

    const reason = await screen.findByText(
      'The Create feature spec workflow is unavailable.',
    )
    const button = screen.getByRole('button', { name: 'Create spec' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-describedby', reason.id)
  })

  test('is disabled with an explanation when the template lookup fails', async () => {
    render({ getEntityByRef: jest.fn().mockRejectedValue(new Error('boom')) })

    expect(
      await screen.findByText(
        'The Create feature spec workflow is unavailable.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Create spec' })).toBeDisabled()
  })

  test('is disabled with an explanation when permission is denied', async () => {
    mockUsePermission.mockReturnValue({ loading: false, allowed: false })
    render()

    const reason = await screen.findByText(
      "You don't have permission to start the Create feature spec workflow.",
    )
    const button = screen.getByRole('button', { name: 'Create spec' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-describedby', reason.id)
  })
})

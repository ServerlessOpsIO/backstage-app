import {
  Entity,
  parseEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model'
import { useApi } from '@backstage/core-plugin-api'
import { catalogApiRef, useEntity } from '@backstage/plugin-catalog-react'
import { useRouteRef } from '@backstage/frontend-plugin-api'
import scaffolderPlugin from '@backstage/plugin-scaffolder/alpha'
import useAsync from 'react-use/esm/useAsync'
import {
  Button,
  ButtonLink,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui'
import {
  CREATE_SPEC_TEMPLATE_NAME,
  CREATE_SPEC_TEMPLATE_NAMESPACE,
  UNAVAILABLE_REASON,
  useCreateSpecAvailability,
} from './useCreateSpecAvailability'

const refOf = (
  value: unknown,
  defaults: { defaultKind: string; defaultNamespace: string },
) =>
  typeof value === 'string' && value
    ? stringifyEntityRef(parseEntityRef(value, defaults))
    : undefined

// The domain is looked up from the component's system and never blocks the
// button; the link simply gains the domain once it resolves.
const useFormData = (entity: Entity) => {
  const catalogApi = useApi(catalogApiRef)
  const namespace = entity.metadata.namespace ?? 'default'
  const system = refOf(entity.spec?.system, {
    defaultKind: 'System',
    defaultNamespace: namespace,
  })

  const { value: domain } = useAsync(async () => {
    if (!system) {
      return undefined
    }
    const systemEntity = await catalogApi.getEntityByRef(system)
    return systemEntity?.relations?.find(
      relation =>
        relation.type === 'partOf' && relation.targetRef.startsWith('domain:'),
    )?.targetRef
  }, [catalogApi, system])

  const owner = refOf(entity.spec?.owner, {
    defaultKind: 'Group',
    defaultNamespace: namespace,
  })

  return Object.fromEntries(
    Object.entries({
      component: stringifyEntityRef(entity),
      system,
      owner,
      domain,
    }).filter(([, value]) => value),
  )
}

export const CreateSpecButton = () => {
  const { state, reason } = useCreateSpecAvailability()
  const { entity } = useEntity()
  const formData = useFormData(entity)
  const scaffolderRoot = useRouteRef(scaffolderPlugin.routes.root)

  if (state === 'available' && scaffolderRoot) {
    const href = `${scaffolderRoot()}/templates/${CREATE_SPEC_TEMPLATE_NAMESPACE}/${CREATE_SPEC_TEMPLATE_NAME}?formData=${encodeURIComponent(JSON.stringify(formData))}`
    return (
      <ButtonLink href={href} variant="primary">
        Create spec
      </ButtonLink>
    )
  }

  const explanation =
    state === 'checking' ? undefined : reason ?? UNAVAILABLE_REASON

  if (explanation) {
    return (
      <TooltipTrigger>
        <Button variant="primary" isDisabled>
          Create spec
        </Button>
        <Tooltip>{explanation}</Tooltip>
      </TooltipTrigger>
    )
  }

  return (
    <Button variant="primary" isDisabled>
      Create spec
    </Button>
  )
}

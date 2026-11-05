import { stringifyEntityRef } from '@backstage/catalog-model'
import { useApi } from '@backstage/core-plugin-api'
import { catalogApiRef } from '@backstage/plugin-catalog-react'
import { usePermission } from '@backstage/plugin-permission-react'
import {
  taskCreatePermission,
  templateParameterReadPermission,
} from '@backstage/plugin-scaffolder-common/alpha'
import useAsync from 'react-use/esm/useAsync'

export const CREATE_SPEC_TEMPLATE_NAMESPACE = 'default'
export const CREATE_SPEC_TEMPLATE_NAME = '1-speckit-feature'
export const CREATE_SPEC_TEMPLATE_REF = stringifyEntityRef({
  kind: 'template',
  namespace: CREATE_SPEC_TEMPLATE_NAMESPACE,
  name: CREATE_SPEC_TEMPLATE_NAME,
})

export const UNAVAILABLE_REASON =
  'The "Create feature spec" workflow is unavailable.'
export const FORBIDDEN_REASON =
  "You don't have permission to start the Create feature spec workflow."

export type CreateSpecAvailability = {
  state: 'checking' | 'available' | 'unavailable' | 'forbidden'
  reason?: string
}

// Independent of the specs list so the button works when that lookup fails.
export const useCreateSpecAvailability = (): CreateSpecAvailability => {
  const catalogApi = useApi(catalogApiRef)

  const { value: template, loading, error } = useAsync(
    () => catalogApi.getEntityByRef(CREATE_SPEC_TEMPLATE_REF),
    [catalogApi],
  )
  const taskCreate = usePermission({ permission: taskCreatePermission })
  const parameterRead = usePermission({
    permission: templateParameterReadPermission,
    resourceRef: CREATE_SPEC_TEMPLATE_REF,
  })

  if (loading) {
    return { state: 'checking' }
  }
  if (error || !template) {
    return { state: 'unavailable', reason: UNAVAILABLE_REASON }
  }
  if (taskCreate.loading || parameterRead.loading) {
    return { state: 'checking' }
  }
  if (!taskCreate.allowed || !parameterRead.allowed) {
    return { state: 'forbidden', reason: FORBIDDEN_REASON }
  }
  return { state: 'available' }
}

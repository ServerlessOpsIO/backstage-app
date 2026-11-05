import { useRouteRef } from '@backstage/frontend-plugin-api'
import scaffolderPlugin from '@backstage/plugin-scaffolder/alpha'
import { Button, ButtonLink, Flex, Text } from '@backstage/ui'
import {
  CREATE_SPEC_TEMPLATE_NAME,
  CREATE_SPEC_TEMPLATE_NAMESPACE,
  UNAVAILABLE_REASON,
  useCreateSpecAvailability,
} from './useCreateSpecAvailability'

const REASON_ID = 'create-spec-button-reason'

export const CreateSpecButton = () => {
  const { state, reason } = useCreateSpecAvailability()
  const scaffolderRoot = useRouteRef(scaffolderPlugin.routes.root)

  if (state === 'available' && scaffolderRoot) {
    const href = `${scaffolderRoot()}/templates/${CREATE_SPEC_TEMPLATE_NAMESPACE}/${CREATE_SPEC_TEMPLATE_NAME}`
    return (
      <ButtonLink href={href} variant="primary">
        Create spec
      </ButtonLink>
    )
  }

  const explanation =
    state === 'checking' ? undefined : reason ?? UNAVAILABLE_REASON

  return (
    <Flex direction="column" align="end" gap="1">
      <Button
        variant="primary"
        isDisabled
        aria-describedby={explanation ? REASON_ID : undefined}
      >
        Create spec
      </Button>
      {explanation && <Text id={REASON_ID}>{explanation}</Text>}
    </Flex>
  )
}

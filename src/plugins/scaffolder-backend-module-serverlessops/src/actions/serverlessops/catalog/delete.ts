import { CatalogApi } from '@backstage/catalog-client'
import { ANNOTATION_LOCATION } from '@backstage/catalog-model'
import { AuthService } from '@backstage/backend-plugin-api'
import { createTemplateAction } from '@backstage/plugin-scaffolder-node'
import {
    getJwt,
    ProviderConfig
} from '@internal/backstage-plugin-catalog-backend-module-serverlessops-catalog'

export function deleteServerlessOpsCatalogAction(
    catalogClient: CatalogApi,
    auth: AuthService,
    config: ProviderConfig,
) {
    return createTemplateAction({
        id: 'serverlessops:catalog:delete',
        description: 'Creates item in ServerlessOps catalog',
        schema: {
            input: {
                entity: z => z.string({
                    description: 'Name of entity to delete'
                })
            }
        },
        async handler(ctx) {
            ctx.logger.info(
                `Deleting ServerlessOps catalog entity: ${ctx.input.entity}`,
            )

            const { token } = (await auth?.getPluginRequestToken({
                onBehalfOf: await ctx.getInitiatorCredentials(),
                targetPluginId: 'catalog',
            })) ?? { token: ctx.secrets?.backstageToken }

            const entity = await catalogClient.getEntityByRef(
                ctx.input.entity as string,
                { token }
            )

            if (typeof entity === 'undefined') {
                throw new Error(`Entity not found: ${ctx.input.entity}`)
            }

            ctx.logger.info(
                `Catalog entity: ${JSON.stringify(entity)}`,
            )

            const jwt = await getJwt(
                config.auth.clientId,
                config.auth.clientSecret,
                config.auth.endpoint
            )

            const url = (entity.metadata.annotations?.[ANNOTATION_LOCATION] as string)
                .split(':')
                .slice(1)
                .join(':')
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${jwt}`
                },
            })

            if (response.status !== 200) {
                throw new Error(
                    `Failed to delete ServerlessOps catalog entity: ${response.statusText}`
                )
            } else {
                ctx.logger.info(
                    `Deleted ServerlessOps catalog entity: ${ctx.input.entity}`
                )
            }
        }
    })
}
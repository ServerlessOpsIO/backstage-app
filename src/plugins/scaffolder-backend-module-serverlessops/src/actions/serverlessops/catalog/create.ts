import {
    Entity
} from '@backstage/catalog-model'
import { createTemplateAction } from '@backstage/plugin-scaffolder-node'
import {
    getJwt,
    ProviderConfig
} from '@internal/backstage-plugin-catalog-backend-module-serverlessops-catalog'

const API_VERSION = 'backstage.io/v1alpha1'

export function createServerlessOpsCatalogAction(
    config: ProviderConfig
) {
    return createTemplateAction({
        id: 'serverlessops:catalog:create',
        description: 'Creates item in ServerlessOps catalog',
        schema: {
            input: {
                kind: z => z.string({
                    description: 'Kind of entity to create'
                }),
                namespace: z => z.string({
                    description: 'Namespace of entity to create'
                }),
                name: z => z.string({
                    description: 'Name of entity to create'
                }),
                description: z => z.string({
                    description: 'Description of entity to create'
                }),
                owner: z => z.string({
                    description: 'Owner of entity to create'
                }),
                type: z => z.string({
                    description: 'Type of entity to create'
                }).optional(),
                domain: z => z.string({
                    description: 'Domain of entity to create'
                }).optional()
            }
        },
        async handler(ctx) {
            const normalizedName = (ctx.input.name as string)
                .replace(/[^\w\s]|[\s]/g, '-')
                .toLowerCase()

            ctx.logger.info(
                `Creating new ServerlessOps catalog entity: ${(ctx.input.kind as string).toLocaleLowerCase()}/${ctx.input.namespace}/${normalizedName}`,
            )

            const jwt = await getJwt(
                config.auth.clientId,
                config.auth.clientSecret,
                config.auth.endpoint
            )

            const entity: Entity = {
                apiVersion: API_VERSION,
                kind: ctx.input.kind as string,
                metadata: {
                    namespace: ctx.input.namespace as string | undefined,
                    name: normalizedName as string,
                    title: ctx.input.name as string,
                    description: ctx.input.description as string,
                },
                spec: {
                    type: ctx.input.type,
                    owner: ctx.input.owner,
                    domain: ctx.input.domain
                }
            }

            const url = `${config.baseUrl}/catalog`
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${jwt}`
                },
                body: JSON.stringify(entity)
            })

            if (response.status !== 201) {
                throw new Error(
                    `Failed to create ServerlessOps catalog entity: ${response.statusText}`
                )
            } else {
                ctx.logger.info(
                    `Created ServerlessOps catalog entity: ${ctx.input.namespace}/${(ctx.input.kind as string).toLowerCase()}/${normalizedName}`
                )
            }
        }
    })
}

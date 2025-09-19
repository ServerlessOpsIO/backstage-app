import { AuthService } from '@backstage/backend-plugin-api';
import { CatalogApi } from '@backstage/catalog-client';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';

export function registerServerlessOpsCatalogAction(
    catalogClient: CatalogApi,
    auth?: AuthService
) {
    return createTemplateAction({
        id: 'serverlessops:catalog:register',
        description: 'Creates item in ServerlessOps catalog',
        schema: {
            input: {
                catalogInfoUrl: z => z.string({
                    description: 'An absolute URL pointing to the catalog info file location',
                }).url('Must be a valid URL')
            },
        },

        async handler(ctx) {
            ctx.logger.info(
                `Registering new entity in Backstage at location: ${ctx.input.catalogInfoUrl}`,
            );

            const { token } = (await auth?.getPluginRequestToken({
                onBehalfOf: await ctx.getInitiatorCredentials(),
                targetPluginId: 'catalog',
            })) ?? { token: ctx.secrets?.backstageToken };

            await catalogClient.addLocation(
                {
                    type: 'url',
                    target: ctx.input.catalogInfoUrl as string,
                },
                {
                    token: token,
                },
            );
        },
    });
}
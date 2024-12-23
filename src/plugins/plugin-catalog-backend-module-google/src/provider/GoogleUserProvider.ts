import {
    ANNOTATION_LOCATION,
    ANNOTATION_ORIGIN_LOCATION,
    UserEntityV1alpha1
} from '@backstage/catalog-model'
import {
    EntityProviderConnection,
} from '@backstage/plugin-catalog-node'
import { Config } from '@backstage/config'
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import { GoogleBaseProvider, ProviderConfig, ProviderOptions } from './GoogleBaseProvider'


const PROVIDER_ANNOTATION_LOCATION = 'url:https://admin.googleapis.com/admin/directory/v1/users'
export const SCOPES = [
    'https://www.googleapis.com/auth/admin.directory.user.readonly',
    'https://www.googleapis.com/auth/admin.directory.group.readonly'
]


export class GoogleUserProvider extends GoogleBaseProvider {
    constructor(
        providerConfig: ProviderConfig,
        options: ProviderOptions
    ) {
        super (providerConfig, options)
        this.logger.info('Initialized Google User Provider')
    }

    static fromConfig(
        config: Config,
        options: ProviderOptions
    ): GoogleUserProvider {
        const providerConfig = config.get('catalog.providers.google') as ProviderConfig | undefined

        return new GoogleUserProvider(providerConfig as ProviderConfig, options)
    }

    async connect(connection: EntityProviderConnection): Promise<void> {
        this.connection = connection
        if (!this.connection) {
            throw new Error('Not initialized')
        }

        await this.taskRunner.run({
            id: this.getProviderName(),
            fn: async () => {
                await this.run()
            }
        })
    }

    async getUserGroups(userId: string, jwt: JWT): Promise<any[]> {
        const service = google.admin({ version: 'directory_v1', auth: jwt })
        const res = await service.groups.list({
            userKey: userId,
        })
        return res.data.groups || []
    }

    async listUsers(jwt: JWT): Promise<any[]> {
        const service = google.admin({ version: 'directory_v1', auth: jwt })
        const res = await service.users.list({
            customer: 'my_customer',
            viewType: 'domain_public'
        })
        return res.data.users || []
    }

    async run(): Promise<void> {
        const jwt = this.getCredentials(
            this.providerConfig.auth.adminAccountEmail,
            this.providerConfig.auth.clientCredentials,
            SCOPES
        )
        const users = await this.listUsers(jwt)

        const collectedEntities: UserEntityV1alpha1[] = await Promise.all(users.map( async (user) => {
            const entity: UserEntityV1alpha1 = {
                apiVersion: 'backstage.io/v1alpha1',
                kind: 'User',
                metadata: {
                    name: `${user.name.givenName.toLowerCase()}.${user.name.familyName.toLowerCase()}`,
                    annotations: {
                        'google.com/user-id': user.id,
                        'google.com/user-kind': user.kind,
                        [ANNOTATION_LOCATION]: PROVIDER_ANNOTATION_LOCATION,
                        [ANNOTATION_ORIGIN_LOCATION]: PROVIDER_ANNOTATION_LOCATION
                    }
                },
                spec: {
                    profile: {
                        displayName: user.name.fullName,
                        email: user.primaryEmail,
                        picture: user.thumbnailPhotoUrl
                    }
                }
            }

            const groups = await this.getUserGroups(user.primaryEmail, jwt)
            entity.spec.memberOf = groups.map( group => group.id )

            return entity
        }))

        this.logger.info(
            `Number of Google users collected: ${collectedEntities.length}`
        )
        await this.connection?.applyMutation({
            type: 'full',
            entities: collectedEntities.map(entity => ({
                entity,
                locationKey: PROVIDER_ANNOTATION_LOCATION
            }))
        })
    }

    getProviderName(): string {
        return 'google-user'
    }
}
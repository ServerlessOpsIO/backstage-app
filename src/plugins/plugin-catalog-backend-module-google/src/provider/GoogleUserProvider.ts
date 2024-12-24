import {
    ANNOTATION_LOCATION,
    ANNOTATION_ORIGIN_LOCATION,
    UserEntityV1alpha1
} from '@backstage/catalog-model'
import {
    EntityProviderConnection,
} from '@backstage/plugin-catalog-node'
import { Config } from '@backstage/config'
import { google, admin_directory_v1 } from 'googleapis'
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

        const jwt = this.getCredentials(
            this.providerConfig.auth.adminAccountEmail,
            this.providerConfig.auth.clientCredentials,
            SCOPES
        )
        this.googleAdmin = google.admin({ version: 'directory_v1', auth: jwt })

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

    async getUserGroups(userId: string): Promise<admin_directory_v1.Schema$Group[]> {
        let pageToken: string | undefined
        let groups: admin_directory_v1.Schema$Group[] = []
        do {
            const res = await this.googleAdmin.groups.list({
                userKey: userId,
                maxResults: this.providerConfig.pageSize || 200,
                pageToken
            })
            groups = groups.concat(res.data.groups || [])
            pageToken = res.data.nextPageToken || undefined
            this.logger.debug(`groups.list() pageToken: ${pageToken}`)
        } while (pageToken)
        return groups
    }

    async listUsers(): Promise<admin_directory_v1.Schema$User[]> {
        let pageToken: string | undefined
        let users: admin_directory_v1.Schema$User[] = []
        do {
            const res = await this.googleAdmin.users.list({
                customer: 'my_customer',
                viewType: 'domain_public',
                maxResults: this.providerConfig.pageSize || 200,
                pageToken
            })
            users = users.concat(res.data.users || [])
            pageToken = res.data.nextPageToken || undefined
            this.logger.debug(`users.list() pageToken: ${pageToken}`)
        } while(pageToken)
        return users
    }

    async run(): Promise<void> {
        const users = await this.listUsers()

        const collectedEntities: UserEntityV1alpha1[] = await Promise.all(users.map( async (user) => {
            const entity: UserEntityV1alpha1 = {
                apiVersion: 'backstage.io/v1alpha1',
                kind: 'User',
                metadata: {
                    name: `${(user.name?.givenName as string).toLowerCase()}.${(user.name?.familyName as string).toLowerCase()}`,
                    annotations: {
                        'google.com/user-id': user.id as string,
                        'google.com/user-kind': user.kind as string,
                        [ANNOTATION_LOCATION]: PROVIDER_ANNOTATION_LOCATION,
                        [ANNOTATION_ORIGIN_LOCATION]: PROVIDER_ANNOTATION_LOCATION
                    }
                },
                spec: {
                    profile: {
                        displayName: user.name?.fullName || undefined,
                        email: user.primaryEmail || undefined,
                        picture: user.thumbnailPhotoUrl || undefined
                    }
                }
            }

            const groups = await this.getUserGroups(user.id as string)
            entity.spec.memberOf = groups.map( group => group.id as string)

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
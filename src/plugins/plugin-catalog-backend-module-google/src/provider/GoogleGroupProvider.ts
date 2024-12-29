import {
    ANNOTATION_LOCATION,
    ANNOTATION_ORIGIN_LOCATION,
    GroupEntityV1alpha1
} from '@backstage/catalog-model'
import {
    EntityProviderConnection,
} from '@backstage/plugin-catalog-node'
import { Config } from '@backstage/config'
import { google, admin_directory_v1 } from 'googleapis'
import { GoogleBaseProvider, ProviderConfig, ProviderOptions } from './GoogleBaseProvider'


const PROVIDER_ANNOTATION_LOCATION = 'url:https://admin.googleapis.com/admin/directory/v1/groups'
export const SCOPES = ['https://www.googleapis.com/auth/admin.directory.group.readonly']


export class GoogleGroupProvider extends GoogleBaseProvider {
    constructor(
        providerConfig: ProviderConfig,
        options: ProviderOptions
    ) {
        super(providerConfig, options)

        const jwt = this.getCredentials(
            this.providerConfig.auth.adminAccountEmail,
            this.providerConfig.auth.clientCredentials,
            SCOPES
        )
        this.googleAdmin = google.admin({ version: 'directory_v1', auth: jwt })

        this.logger.info('Initialized Google Group Provider')
    }

    static fromConfig(
        config: Config,
        options: ProviderOptions
    ): GoogleGroupProvider {
        const providerConfig = config.get('catalog.providers.google') as ProviderConfig | undefined

        return new GoogleGroupProvider(providerConfig as ProviderConfig, options)
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

    async listGroups(): Promise<admin_directory_v1.Schema$Group[]> {
        if (!this.googleAdmin) {
            throw new Error('Google Admin not initialized')
        }

        let pageToken: string | undefined
        let groups: admin_directory_v1.Schema$Group[] = []
        do {
            const res = await this.googleAdmin.groups.list({
                customer: 'my_customer',
                maxResults: this.providerConfig.pageSize || 200,
                pageToken
            })
            groups = groups.concat(res.data.groups || [])
            pageToken = res.data.nextPageToken || undefined
            this.logger.debug(`groups.list() pageToken: ${pageToken}`)
        } while (pageToken)
        return groups
    }

    async run(): Promise<void> {
        const groups = await this.listGroups()

        const collectedEntities: GroupEntityV1alpha1[] = groups.map(group => ({
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'Group',
            metadata: {
                name: group.id as string,
                title: group.name || undefined,
                description: group.description || undefined,
                annotations: {
                    'google.com/group-id': group.id as string,
                    'google.com/group-kind': group.kind as string,
                    [ANNOTATION_LOCATION]: PROVIDER_ANNOTATION_LOCATION,
                    [ANNOTATION_ORIGIN_LOCATION]: PROVIDER_ANNOTATION_LOCATION
                }
            },
            spec: {
                type: 'group',
                children: [],
                profile: {
                    email: group.email || undefined,
                    displayName: group.name || undefined,
                    description: group.description
                }
            }
        }))

        this.logger.info(
            `Number of Google groups collected: ${collectedEntities.length}`
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
        return 'google-group'
    }
}
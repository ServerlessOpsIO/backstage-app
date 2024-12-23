import {
    ANNOTATION_LOCATION,
    ANNOTATION_ORIGIN_LOCATION,
    Entity
} from '@backstage/catalog-model'
import {
    EntityProviderConnection,
} from '@backstage/plugin-catalog-node'
import { Config } from '@backstage/config'
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import { GoogleBaseProvider, ProviderConfig, ProviderOptions } from './GoogleBaseProvider'


const PROVIDER_ANNOTATION_LOCATION = 'url:https://admin.googleapis.com/admin/directory/v1/groups'
const SCOPES = ['https://www.googleapis.com/auth/admin.directory.group.readonly']


export class GoogleGroupProvider extends GoogleBaseProvider {
    constructor(
        providerConfig: ProviderConfig,
        options: ProviderOptions
    ) {
        super(providerConfig, options)
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

    async listGroups(jwt: JWT): Promise<any[]> {
        const service = google.admin({ version: 'directory_v1', auth: jwt })
        const res = await service.groups.list({
            customer: 'my_customer',
        })
        return res.data.groups || []
    }

    async run(): Promise<void> {
        const jwt = this.getCredentials(
            this.providerConfig.auth.adminAccountEmail,
            this.providerConfig.auth.clientCredentials,
            SCOPES
        )
        const groups = await this.listGroups(jwt)
        const collectedEntities: Entity[] = groups.map(group => ({
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'Group',
            metadata: {
                name: group.id,
                description: group.description,
                annotations: {
                    'google.com/group-id': group.id,
                    'google.com/group-kind': group.kind,
                    [ANNOTATION_LOCATION]: PROVIDER_ANNOTATION_LOCATION,
                    [ANNOTATION_ORIGIN_LOCATION]: PROVIDER_ANNOTATION_LOCATION
                }
            },
            spec: {
                type: 'security-group',
                children: [],
                profile: {
                    email: group.email,
                    displayName: group.name,
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
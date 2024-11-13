// FIXME: Not sure I actually need all this?
// I believe providers are needed when we wa

import {
    ANNOTATION_LOCATION,
    ANNOTATION_ORIGIN_LOCATION,
    Entity
} from '@backstage/catalog-model'
import {
    EntityProvider,
    EntityProviderConnection,
} from '@backstage/plugin-catalog-node'
import {
    LoggerService,
    SchedulerServiceTaskRunner,
    SchedulerServiceTaskScheduleDefinition
} from '@backstage/backend-plugin-api'
import { Config } from '@backstage/config'
 import { getJwt, isJwtExpired } from '../util/jwt'

/** Configuration for the ServerlessOps catalog provider */
export interface ProviderConfig {
    baseUrl: string
    namespace: string
    entityKinds: string[]
    auth: {
        endpoint: string
        clientId: string
        clientSecret: string
    },
    schedule: SchedulerServiceTaskScheduleDefinition
}

export interface ProviderOptions {
    logger: LoggerService
    taskRunner: SchedulerServiceTaskRunner
}

export interface ApiEntityList {
    entities: string[]
}

export class ServerlessOpsCatalogProvider implements EntityProvider {
    private readonly providerConfig: ProviderConfig
    private connection?: EntityProviderConnection
    private readonly logger: LoggerService
    private taskRunner: SchedulerServiceTaskRunner

    private jwt?: string

    constructor(
        providerConfig: ProviderConfig,
        options: ProviderOptions
    ) {
        this.providerConfig = providerConfig
        this.logger = options.logger.child({target: this.getProviderName()})
        this.taskRunner = options.taskRunner

        this.logger.info('Initialized ServerlessOps Catalog')
    }

    static fromConfig(
        config: Config,
        options: ProviderOptions
    ): ServerlessOpsCatalogProvider {
        const providerConfig = config.get('catalog.providers.serverlessops-catalog') as ProviderConfig | undefined

        return new ServerlessOpsCatalogProvider(providerConfig as ProviderConfig, options)
    }

    async connect(connection: EntityProviderConnection): Promise<void> {
        this.connection = connection
        if (!this.connection) {
            throw new Error('Not initialized');
        }

        await this.taskRunner.run({
            id: this.getProviderName(),
            fn: async () => {
                await this.run()
            }
        })
    }

    async run(): Promise<void> {
        if (!this.jwt || isJwtExpired(this.jwt)) {
            this.jwt = await getJwt(
                this.providerConfig.auth.clientId,
                this.providerConfig.auth.clientSecret,
                this.providerConfig.auth.endpoint
            )
        }

        const collectedEntities: Entity[] = []
        await Promise.all(this.providerConfig.entityKinds.map(async (kind) => {
            const entities = await this.getEntitiesByKind(kind, this.jwt as string)

            await Promise.all(entities.entities.map(async (entry) => {
                const entity = await this.getEntityByPath(entry, this.jwt as string)
                const locationAnnotations = {
                    [ANNOTATION_LOCATION]: `url:${this.providerConfig.baseUrl}/${entry}`,
                    [ANNOTATION_ORIGIN_LOCATION]: `url:${this.providerConfig.baseUrl}/${entry}`
                }

                entity.metadata.annotations = {
                    ...entity.metadata.annotations,
                    ...locationAnnotations
                }

                collectedEntities.push(entity)
            }))
        }))

        this.logger.info(
            `Number of entities collected from ServerlessOps catalog: ${collectedEntities.length}`
        )
        await this.connection?.applyMutation({
            type: 'full',
            entities: collectedEntities.map(entity => ({
                entity,
                locationKey: this.providerConfig.baseUrl
            }))
        })
    }

    getProviderName(): string {
        return 'serverlessops-catalog'
    }

    /**
     * Make a request to API to get a list of entities by kind
     *
     * @param kind - The kind of entity to fetch
     * @param jwt - The JWT token to use for authentication
     *
     * @returns A Promise that resolves to a list of entities
     */
    async getEntitiesByKind(kind: string, jwt: string): Promise<ApiEntityList> {
        this.logger.info(`Getting entities by kind: ${kind}`)
        try {
            const url = `${this.providerConfig.baseUrl}/catalog/${this.providerConfig.namespace}/${kind.toLowerCase()}`
            const response = await fetch(
                url,
                {
                    headers: {
                        Authorization: `Bearer ${jwt}`
                    }
                }
            )

            if (!response.ok) {
                throw new Error(response.statusText)
            }

            return await response.json()
        } catch (error) {
            throw new Error(`Failed to get entities by kind: ${error}`)
        }
    }

    /**
     * Make a request to API to get an entity by path
     *
     * @param path - The path of the entity to fetch
     * @param jwt - The JWT token to use for authentication
     *
     * @returns A Promise that resolves to an entity
     */
    async getEntityByPath(path: string, jwt: string): Promise<Entity> {
        try {
            const response = await fetch(
                `${this.providerConfig.baseUrl}/catalog/${path}`,
                {
                    headers: {
                        Authorization: `Bearer ${jwt}`
                    }
                }
            )

            if (!response.ok) {
                throw new Error(response.statusText)
            }

            return response.json()
        } catch (error) {
            throw new Error(`Failed to get entity at ${path}: ${error}`)
        }
    }
}
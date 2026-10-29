// FIXME: Not sure I actually need all this?
// I believe providers are needed when we wa

import {
    ANNOTATION_LOCATION,
    ANNOTATION_ORIGIN_LOCATION,
    Entity
} from '@backstage/catalog-model'
import {
    DeferredEntity,
    EntityProvider,
    EntityProviderConnection,
} from '@backstage/plugin-catalog-node'
import {
    LoggerService,
    SchedulerServiceTaskRunner,
    SchedulerServiceTaskScheduleDefinition
} from '@backstage/backend-plugin-api'
import { Config } from '@backstage/config'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import { getJwt, isJwtExpired } from '../util/jwt'

axiosRetry(
    axios,
    {
        retries: 3,
        retryDelay: axiosRetry.exponentialDelay
    }
)


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
    nextToken?: string
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

        const collectedEntities: DeferredEntity[] = []
        await Promise.all(this.providerConfig.entityKinds.map(async (kind) => {
            const entities = await this.getEntitiesByKind(kind, this.jwt as string)

            await Promise.all(entities.entities.map(async (entry) => {
                const entity = await this.getEntityByPath(entry, this.jwt as string)
                // entry is <namespace>/<kind>/<name>
                const locationRef = `url:${this.providerConfig.baseUrl}/catalog/${entry}`
                const locationAnnotations = {
                    [ANNOTATION_LOCATION]: locationRef,
                    [ANNOTATION_ORIGIN_LOCATION]: locationRef
                }

                entity.metadata.annotations = {
                    ...entity.metadata.annotations,
                    ...locationAnnotations
                }

                collectedEntities.push({ entity, locationKey: locationRef })
            }))
        }))

        this.logger.info(
            `Number of entities collected from ServerlessOps catalog: ${collectedEntities.length}`
        )
        await this.connection?.applyMutation({
            type: 'full',
            entities: collectedEntities
        })
    }

    getProviderName(): string {
        return 'serverlessops-catalog'
    }

    /**
     * Make requests to API to get a list of entities by kind, following
     * nextToken until all pages have been fetched
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
            const entities: string[] = []
            let nextToken: string | undefined

            do {
                const response = await axios.get(
                    url,
                    {
                        headers: {
                            Authorization: `Bearer ${jwt}`
                        },
                        ...(nextToken && { params: { nextToken } })
                    }
                )
                const page = response.data as ApiEntityList

                if (page.nextToken && page.nextToken === nextToken) {
                    throw new Error(`API returned the same nextToken twice: ${nextToken}`)
                }

                entities.push(...page.entities)
                nextToken = page.nextToken
            } while (nextToken)

            return { entities }
        } catch (error) {
            throw new Error(`Failed to get entities by kind: ${(error as Error).message}`)
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
            const response = await axios.get(
                `${this.providerConfig.baseUrl}/catalog/${path}`,
                {
                    headers: {
                        Authorization: `Bearer ${jwt}`
                    }
                }
            )

            return response.data as Entity
        } catch (error) {
            throw new Error(`Failed to get entity at ${path}: ${(error as Error).message}`)
        }
    }
}
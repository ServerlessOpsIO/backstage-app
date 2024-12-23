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
import { JWT, JWTInput } from 'google-auth-library'
import { admin_directory_v1 } from 'googleapis'


export interface ProviderConfig {
    auth: {
        adminAccountEmail: string
        clientCredentials: JWTInput
    }
    schedule: SchedulerServiceTaskScheduleDefinition
}

export interface ProviderOptions {
    logger: LoggerService
    taskRunner: SchedulerServiceTaskRunner
}


export class GoogleBaseProvider implements EntityProvider {
    readonly providerConfig: ProviderConfig
    connection?: EntityProviderConnection
    readonly logger: LoggerService
    taskRunner: SchedulerServiceTaskRunner
    googleAdmin?: admin_directory_v1.Admin

    constructor(
        providerConfig: ProviderConfig,
        options: ProviderOptions
    ) {
        this.providerConfig = providerConfig
        this.logger = options.logger.child({ target: this.getProviderName() })
        this.taskRunner = options.taskRunner
    }

    static fromConfig(
        config: Config,
        options: ProviderOptions
    ): GoogleBaseProvider {
        const providerConfig = config.get('catalog.providers.google') as ProviderConfig | undefined

        return new GoogleBaseProvider(providerConfig as ProviderConfig, options)
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

    async run(): Promise<void> { return }

    getProviderName(): string {
        return 'google-base'
    }

    getCredentials(adminEmail: string, credentials: JWTInput, scopes: string[]): JWT {
        const auth = new JWT({
            subject: adminEmail,
            scopes
        })
        auth.fromJSON(credentials)
        return auth
    }
}
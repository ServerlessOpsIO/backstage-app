import { client } from '@datadog/datadog-api-client';

/**
 * Datadog configuration parameters
 *
 * @remarks
 * This interface is not exported from the Datadog module so recreating it here. It is a
 * slightly abbreviated form of the original interface, removing some things that cannot be
 * represented in the YAML configuration.
 */
export interface ConfigurationParameters {
    /**
     * Default server to use
     */
    server?: string;
    /**
     * Default index of a server to use from the predefined server list
     */
    httpApi?: client.HttpLibrary;
    /**
     * Configuration for the available authentication methods
     */
    authMethods?: client.AuthMethodsConfiguration;
    /**
     * Configuration for HTTP transport
     */
    httpConfig?: client.HttpConfiguration;
    /**
     * Flag to enable requests tracing
     */
    debug?: boolean;
    /**
     * Callback method to compress string body with zstd
     */
    maxRetries?: number;
    /**
     * Backoff base
     */
    backoffBase?: number;
    /**
     * Backoff multiplier
     */
    backoffMultiplier?: number;
    /**
     * Enable retry on status code 429 or 5xx
     */
    enableRetry?: boolean;
}
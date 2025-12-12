/**
 * Configuration for the OIF Provider
 * @description Configuration options for connecting to an OIF-compliant solver
 */
export interface OifProviderConfig {
    /**
     * Unique solver instance identifier
     * @description Identifier for this specific solver instance.
     * @example "oif-solver-1"
     */
    solverId: string;

    /**
     * HTTP endpoint for the solver API
     * @description Base URL for the OIF solver API (must be HTTPS)
     * @example "https://oif-api.openzeppelin.com"
     */
    url: string;

    /**
     * Optional custom HTTP headers for requests
     * @description Additional headers to include in all HTTP requests to the solver
     * @example { "X-API-Key": "your-api-key" }
     */
    headers?: Record<string, string>;

    /**
     * Adapter-specific metadata
     * @description JSON configuration for adapter customization
     */
    adapterMetadata?: Record<string, unknown>;

    /**
     * Optional provider identifier override
     * @description Override the provider identifier. Defaults to solverId if not provided.
     * Useful when you need multiple instances with the same solverId but different configurations.
     * @example "oif-solver-1-mainnet"
     */
    providerId?: string;
}

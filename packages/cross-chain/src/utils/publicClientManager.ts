import { Chain, createPublicClient, http, PublicClient } from "viem";

/**
 * Manages PublicClient instances with caching to avoid creating duplicate clients.
 *
 * This class is designed to be created once per SDK factory call and shared across
 * all service instances (OpenEventWatcher, DepositInfoParser, FillWatcher, etc.).
 *
 * Benefits:
 * - Single PublicClient instance per chain across all services
 * - Efficient resource usage
 * - Clear ownership: factory creates and manages the lifecycle
 * - Services remain simple without caching responsibility
 *
 * @example
 * ```typescript
 * // In a factory function
 * const clientManager = new PublicClientManager(publicClient, rpcUrls);
 *
 * // Pass to all services
 * const openWatcher = new OpenEventWatcher({ clientManager });
 * const fillWatcher = new EventBasedFillWatcher(config, { clientManager });
 * ```
 */
export class PublicClientManager {
    private readonly cache: Map<number, PublicClient> = new Map();

    /**
     * @param customClient - Optional pre-configured PublicClient to use for all chains
     * @param customRpcUrls - Optional custom RPC URLs per chain ID
     */
    constructor(
        private readonly customClient?: PublicClient,
        private readonly customRpcUrls?: Record<number, string>,
    ) {}

    /**
     * Get or create a PublicClient for the specified chain
     *
     * @param chain - The chain configuration
     * @returns PublicClient instance for the chain
     */
    getClient(chain: Chain): PublicClient {
        // If a custom client was provided, use it for all chains
        // (useful for testing or when user wants full control)
        if (this.customClient) {
            return this.customClient;
        }

        // Check if we already have a cached client for this chain
        if (this.cache.has(chain.id)) {
            return this.cache.get(chain.id)!;
        }

        // Create a new client with custom RPC URL or use chain's default
        const rpcUrl = this.customRpcUrls?.[chain.id];

        const client = createPublicClient({
            chain,
            transport: http(rpcUrl), // If undefined, viem uses chain's default RPC
        });

        // Cache for future use
        this.cache.set(chain.id, client);
        return client;
    }
}

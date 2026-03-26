import { Chain, createPublicClient, http, PublicClient } from "viem";

/**
 * Manages PublicClient instances with caching to avoid creating duplicate clients.
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
        if (this.customClient) {
            return this.customClient;
        }

        if (this.cache.has(chain.id)) {
            return this.cache.get(chain.id)!;
        }

        const rpcUrl = this.customRpcUrls?.[chain.id];

        const client = createPublicClient({
            chain,
            transport: http(rpcUrl),
        });

        this.cache.set(chain.id, client);
        return client;
    }
}

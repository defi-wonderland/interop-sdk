import { Address, Chain, createPublicClient, decodeEventLog, Hex, http, PublicClient } from "viem";

import {
    ACROSS_FILLED_RELAY_EVENT_ABI,
    ACROSS_SPOKE_POOL_ADDRESSES,
    FillEvent,
    FillWatcher,
    SUPPORTED_CHAINS,
    WatchFillParams,
} from "../internal.js";

/**
 * Error thrown when fill times out
 */
export class FillTimeoutError extends Error {
    constructor(depositId: bigint, timeout: number) {
        super(
            `Fill timeout after ${timeout}ms for depositId ${depositId}. The intent may still be filled later.`,
        );
        this.name = "FillTimeoutError";
    }
}

/**
 * Error thrown when fill event is not found
 */
export class FillNotFoundError extends Error {
    constructor(depositId: bigint, originChainId: number) {
        super(`Fill not found for depositId ${depositId} from chain ${originChainId}`);
        this.name = "FillNotFoundError";
    }
}

/**
 * Across-specific fill watcher
 * Watches for FilledRelay events on Across SpokePool contracts
 */
export class AcrossFillWatcher implements FillWatcher {
    private readonly clientCache: Map<number, PublicClient> = new Map();

    constructor(private readonly dependencies?: { publicClient?: PublicClient }) {}

    /**
     * Get or create a public client for a specific chain
     * Follows the same pattern as existing providers
     */
    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        // Use provided client if available
        if (this.dependencies?.publicClient) {
            return this.dependencies.publicClient;
        }

        // Check cache
        if (this.clientCache.has(chain.id)) {
            return this.clientCache.get(chain.id)!;
        }

        // Create new client
        // TODO: Make RPC URLs configurable
        // Using public nodes for testnet - may be rate-limited or unreliable
        const rpcUrl =
            chain.id === 84532
                ? "https://base-sepolia-rpc.publicnode.com" // More reliable public RPC
                : undefined; // Use default for other chains

        const client = createPublicClient({
            chain,
            transport: http(rpcUrl),
        });

        this.clientCache.set(chain.id, client);
        return client;
    }

    /**
     * Watch for a fill on the destination chain (single check)
     *
     * @param params - Parameters for watching the fill
     * @returns Fill event data if found, null if not yet filled
     */
    async watchFill(params: WatchFillParams): Promise<FillEvent | null> {
        const { destinationChainId, originChainId, depositId } = params;

        // Get destination chain
        const destinationChain = SUPPORTED_CHAINS.find((c) => c.id === destinationChainId);
        if (!destinationChain) {
            throw new Error(`Unsupported destination chain ID: ${destinationChainId}`);
        }

        // Get SpokePool address for destination chain
        const spokePoolAddress = ACROSS_SPOKE_POOL_ADDRESSES[destinationChainId];
        if (!spokePoolAddress) {
            throw new Error(`SpokePool address not configured for chain ${destinationChainId}`);
        }

        const publicClient = this.getPublicClient({ chain: destinationChain });

        // Get current block to search from
        const currentBlock = await publicClient.getBlockNumber();

        // Search back a reasonable number of blocks
        // Public RPCs limit to 50,000 blocks max
        // Fills typically happen within minutes (a few hundred blocks)
        // We search back 40,000 blocks to stay under the limit and catch recent fills
        const maxBlockRange = 40000n;
        const fromBlock = currentBlock > maxBlockRange ? currentBlock - maxBlockRange : 0n;

        try {
            // Query for FilledRelay events matching our (originChainId, depositId)
            const logs = await publicClient.getLogs({
                address: spokePoolAddress,
                event: ACROSS_FILLED_RELAY_EVENT_ABI[0],
                args: {
                    originChainId: BigInt(originChainId),
                    depositId: depositId,
                },
                fromBlock,
                toBlock: "latest",
            });

            if (logs.length === 0) {
                // Not filled yet
                return null;
            }

            // Take the first matching log (should only be one)
            const log = logs[0];
            if (!log) {
                return null;
            }

            // Get block details for timestamp
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

            // Decode the event to extract relayer and recipient
            const decoded = decodeEventLog({
                abi: ACROSS_FILLED_RELAY_EVENT_ABI,
                data: log.data,
                topics: log.topics,
            });

            // Extract relayer and recipient from bytes32
            // Bytes32 addresses are right-aligned, so we take the last 20 bytes
            const relayerBytes32 = decoded.args.relayer as Hex;
            const recipientBytes32 = decoded.args.recipient as Hex;

            const relayer = `0x${relayerBytes32.slice(-40)}` as Address;
            const recipient = `0x${recipientBytes32.slice(-40)}` as Address;

            if (!log.transactionHash) {
                return null;
            }

            return {
                fillTxHash: log.transactionHash,
                blockNumber: log.blockNumber,
                timestamp: Number(block.timestamp),
                originChainId,
                depositId,
                relayer,
                recipient,
            };
        } catch (error) {
            // Log error but don't throw - treat as not filled yet
            // This allows polling to continue on transient RPC errors
            console.error(
                `Error querying fill events: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            return null;
        }
    }

    /**
     * Wait for a fill with polling and timeout
     *
     * @param params - Parameters for watching the fill
     * @param timeout - Timeout in milliseconds (default: 5 minutes)
     * @returns Fill event data
     * @throws {FillTimeoutError} If timeout is reached before fill
     */
    async waitForFill(
        params: WatchFillParams,
        timeout: number = 3 * 60 * 1000,
    ): Promise<FillEvent> {
        const pollingInterval = 5000; // 5 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const fillEvent = await this.watchFill(params);

            if (fillEvent) {
                return fillEvent;
            }

            // Wait before next poll
            await new Promise((resolve) => setTimeout(resolve, pollingInterval));
        }

        // Timeout reached
        throw new FillTimeoutError(params.depositId, timeout);
    }
}

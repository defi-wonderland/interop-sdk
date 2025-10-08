import { Address, Chain, createPublicClient, decodeEventLog, Hex, http, PublicClient } from "viem";

import { DEFAULT_PUBLIC_RPC_URLS } from "../constants/chains.js";
import {
    ACROSS_FILLED_RELAY_EVENT_ABI,
    ACROSS_SPOKE_POOL_ADDRESSES,
    FillEvent,
    FillWatcher,
    SUPPORTED_CHAINS,
    WatchFillParams,
} from "../internal.js";

export class FillTimeoutError extends Error {
    constructor(depositId: bigint, timeout: number) {
        super(
            `Fill timeout after ${timeout}ms for depositId ${depositId}. The intent may still be filled later.`,
        );
        this.name = "FillTimeoutError";
    }
}

export class FillNotFoundError extends Error {
    constructor(depositId: bigint, originChainId: number) {
        super(`Fill not found for depositId ${depositId} from chain ${originChainId}`);
        this.name = "FillNotFoundError";
    }
}

export interface AcrossFillWatcherDependencies {
    publicClient?: PublicClient;
    rpcUrls?: Record<number, string>;
}

export class AcrossFillWatcher implements FillWatcher {
    private readonly clientCache: Map<number, PublicClient> = new Map();

    constructor(private readonly dependencies?: AcrossFillWatcherDependencies) {}

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        if (this.dependencies?.publicClient) {
            return this.dependencies.publicClient;
        }

        if (this.clientCache.has(chain.id)) {
            return this.clientCache.get(chain.id)!;
        }

        const customRpcUrl = this.dependencies?.rpcUrls?.[chain.id];
        const defaultRpcUrl = DEFAULT_PUBLIC_RPC_URLS[chain.id] as string | undefined;
        const rpcUrl: string | undefined = customRpcUrl || defaultRpcUrl;

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

        const destinationChain = SUPPORTED_CHAINS.find((c) => c.id === destinationChainId);
        if (!destinationChain) {
            throw new Error(`Unsupported destination chain ID: ${destinationChainId}`);
        }

        const spokePoolAddress = ACROSS_SPOKE_POOL_ADDRESSES[destinationChainId];
        if (!spokePoolAddress) {
            throw new Error(`SpokePool address not configured for chain ${destinationChainId}`);
        }

        const publicClient = this.getPublicClient({ chain: destinationChain });

        const currentBlock = await publicClient.getBlockNumber();

        const maxBlockRange = 40000n; // Public RPCs limit to 50,000 blocks max
        const fromBlock = currentBlock > maxBlockRange ? currentBlock - maxBlockRange : 0n;

        try {
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
                return null;
            }

            const log = logs[0];
            if (!log) {
                return null;
            }

            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

            const decoded = decodeEventLog({
                abi: ACROSS_FILLED_RELAY_EVENT_ABI,
                data: log.data,
                topics: log.topics,
            });

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

            await new Promise((resolve) => setTimeout(resolve, pollingInterval));
        }

        throw new FillTimeoutError(params.depositId, timeout);
    }
}

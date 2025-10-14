import { Abi, Address, Chain, createPublicClient, http, Log, PublicClient } from "viem";

import { FillEvent, FillWatcher, getChainById, WatchFillParams } from "../internal.js";

export class FillTimeoutError extends Error {
    constructor(depositId: bigint, timeout: number) {
        super(
            `Fill timeout after ${timeout}ms for depositId ${depositId}. The intent may still be filled later.`,
        );
        this.name = "FillTimeoutError";
    }
}

export interface FillWatcherConfig {
    /** Contract addresses per chain ID where fill events are emitted */
    contractAddresses: Record<number, Address>;
    /** Event ABI for the fill event */
    eventAbi: Abi;
    /** Function to build getLogs parameters from watch params */
    buildLogsArgs: (
        params: WatchFillParams,
        contractAddress: Address,
    ) => {
        address: Address;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args?: any;
    };
    /** Function to extract FillEvent from the matched log */
    extractFillEvent: (log: Log, params: WatchFillParams) => FillEvent | null;
}

export interface EventBasedFillWatcherDependencies {
    publicClient?: PublicClient;
    rpcUrls?: Record<number, string>;
}

/**
 * Generic event-based fill watcher
 * Can be configured for any protocol that emits fill events
 */
export class EventBasedFillWatcher implements FillWatcher {
    private readonly clientCache: Map<number, PublicClient> = new Map();

    constructor(
        private readonly config: FillWatcherConfig,
        private readonly dependencies?: EventBasedFillWatcherDependencies,
    ) {}

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        if (this.dependencies?.publicClient) {
            return this.dependencies.publicClient;
        }

        if (this.clientCache.has(chain.id)) {
            return this.clientCache.get(chain.id)!;
        }

        const client = createPublicClient({
            chain,
            transport: http(this.dependencies?.rpcUrls?.[chain.id]),
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
        const { destinationChainId } = params;

        const destinationChain = getChainById(destinationChainId);
        const contractAddress = this.config.contractAddresses[destinationChainId];
        if (!contractAddress) {
            throw new Error(`Contract address not configured for chain ${destinationChainId}`);
        }

        const publicClient = this.getPublicClient({ chain: destinationChain });

        const currentBlock = await publicClient.getBlockNumber();

        const maxBlockRange = 40000n; // Public RPCs limit to 50,000 blocks max
        const fromBlock = currentBlock > maxBlockRange ? currentBlock - maxBlockRange : 0n;

        try {
            const logsArgs = this.config.buildLogsArgs(params, contractAddress);

            const logs = await publicClient.getLogs({
                ...logsArgs,
                fromBlock,
                toBlock: "latest",
            });

            if (logs.length === 0) {
                return null;
            }

            const log = logs[0];
            if (!log || !log.transactionHash) {
                return null;
            }

            const fillEvent = this.config.extractFillEvent(log, params);
            if (!fillEvent) {
                return null;
            }

            // Get block timestamp if not already set
            if (fillEvent.timestamp === 0 && log.blockNumber) {
                const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                fillEvent.timestamp = Number(block.timestamp);
            }

            return fillEvent;
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
     * @param timeout - Timeout in milliseconds (default: 3 minutes)
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

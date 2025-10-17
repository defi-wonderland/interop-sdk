import { Abi, AbiEvent, Address, Chain, Log, PublicClient } from "viem";

import {
    FillEvent,
    FillWatcher,
    getChainById,
    GetFillParams,
    PublicClientManager,
} from "../internal.js";

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
    /** Function to build getLogs parameters from fill params */
    buildLogsArgs: (
        params: GetFillParams,
        contractAddress: Address,
    ) => {
        address: Address;
        event: AbiEvent;
        args?: Record<string, unknown>;
    };
    /** Function to extract FillEvent from the matched log */
    extractFillEvent: (log: Log, params: GetFillParams) => FillEvent | null;
}

export interface EventBasedFillWatcherDependencies {
    clientManager: PublicClientManager;
}

/**
 * Generic event-based fill watcher
 * Can be configured for any protocol that emits fill events
 */
export class EventBasedFillWatcher implements FillWatcher {
    constructor(
        private readonly config: FillWatcherConfig,
        private readonly dependencies: EventBasedFillWatcherDependencies,
    ) {}

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        return this.dependencies.clientManager.getClient(chain);
    }

    /**
     * Get the current fill status on the destination chain (single check)
     *
     * @param params - Parameters for getting the fill
     * @returns Fill event data if found, null if not yet filled
     * @note Only searches the last 40,000 blocks. Older fills will not be detected.
     */
    async getFill(params: GetFillParams): Promise<FillEvent | null> {
        const { destinationChainId } = params;

        const destinationChain = getChainById(destinationChainId);
        const contractAddress = this.config.contractAddresses[destinationChainId];
        if (!contractAddress) {
            throw new Error(`Contract address not configured for chain ${destinationChainId}`);
        }

        const publicClient = this.getPublicClient({ chain: destinationChain });

        try {
            const currentBlock = await publicClient.getBlockNumber();

            const maxBlockRange = 40000n; // Public RPCs limit to 50,000 blocks max
            const fromBlock = currentBlock > maxBlockRange ? currentBlock - maxBlockRange : 0n;

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
     * @param params - Parameters for getting the fill
     * @param timeout - Timeout in milliseconds (default: 3 minutes)
     * @returns Fill event data
     * @throws {FillTimeoutError} If timeout is reached before fill
     * @throws {Error} If timeout is not positive
     */
    async waitForFill(params: GetFillParams, timeout: number = 3 * 60 * 1000): Promise<FillEvent> {
        if (timeout <= 0) {
            throw new Error(`Timeout must be positive, got ${timeout}ms`);
        }

        const pollingInterval = 5000; // 5 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const fillEvent = await this.getFill(params);

            if (fillEvent) {
                return fillEvent;
            }

            await new Promise((resolve) => setTimeout(resolve, pollingInterval));
        }

        throw new FillTimeoutError(params.depositId, timeout);
    }
}

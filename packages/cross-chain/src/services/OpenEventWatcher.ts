import { Chain, decodeEventLog, Hex, PublicClient } from "viem";

import {
    getChainById,
    OPEN_EVENT_ABI,
    OPEN_EVENT_SIGNATURE,
    OpenEvent,
    PublicClientManager,
} from "../internal.js";

export class OpenEventNotFoundError extends Error {
    constructor(txHash: Hex) {
        super(`Open event not found in transaction ${txHash}`);
        this.name = "OpenEventNotFoundError";
    }
}

export class InvalidOpenEventError extends Error {
    constructor(message: string) {
        super(`Invalid Open event: ${message}`);
        this.name = "InvalidOpenEventError";
    }
}

export interface OpenEventWatcherDependencies {
    clientManager: PublicClientManager;
}

/**
 * Service for watching and parsing EIP-7683 Open events
 * Protocol-agnostic - works with any EIP-7683 compliant settlement contract
 */
export class OpenEventWatcher {
    constructor(private readonly dependencies: OpenEventWatcherDependencies) {}

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        return this.dependencies.clientManager.getClient(chain);
    }

    /**
     * Parse EIP-7683 Open event from a transaction receipt
     * Protocol-agnostic - works for any EIP-7683 compliant protocol
     *
     * @param txHash - Transaction hash to parse
     * @param chainId - Chain ID where the transaction occurred
     * @returns Open event data
     * @throws {OpenEventNotFoundError} If Open event is not found
     * @throws {InvalidOpenEventError} If Open event data is malformed
     */
    async getOpenEvent(txHash: Hex, chainId: number): Promise<OpenEvent> {
        const chain = getChainById(chainId);
        const publicClient = this.getPublicClient({ chain });

        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

        const openLog = receipt.logs.find((log) => log.topics[0] === OPEN_EVENT_SIGNATURE);

        if (!openLog) {
            throw new OpenEventNotFoundError(txHash);
        }

        try {
            const decoded = decodeEventLog({
                abi: OPEN_EVENT_ABI,
                data: openLog.data,
                topics: openLog.topics,
            });

            const { orderId, resolvedOrder } = decoded.args;

            if (!orderId || !resolvedOrder) {
                throw new InvalidOpenEventError("Missing orderId or resolvedOrder");
            }

            return {
                orderId,
                resolvedOrder: {
                    user: resolvedOrder.user,
                    originChainId: resolvedOrder.originChainId,
                    openDeadline: resolvedOrder.openDeadline,
                    fillDeadline: resolvedOrder.fillDeadline,
                    orderId: resolvedOrder.orderId,
                },
                settlementContract: openLog.address,
                txHash,
                blockNumber: receipt.blockNumber,
            };
        } catch (error) {
            if (error instanceof InvalidOpenEventError) {
                throw error;
            }
            throw new InvalidOpenEventError(
                error instanceof Error ? error.message : "Unknown error decoding event",
            );
        }
    }
}

import { Chain, createPublicClient, decodeEventLog, Hex, http, PublicClient } from "viem";

import {
    DEFAULT_PUBLIC_RPC_URLS,
    DepositInfo,
    OPEN_EVENT_ABI,
    OPEN_EVENT_SIGNATURE,
    OpenEvent,
    parseAbiEncodedFields,
    SUPPORTED_CHAINS,
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

export class DepositEventNotFoundError extends Error {
    constructor(txHash: Hex, protocol: string) {
        super(`${protocol} deposit event not found in transaction ${txHash}`);
        this.name = "DepositEventNotFoundError";
    }
}

export interface OpenEventWatcherDependencies {
    publicClient?: PublicClient;
    rpcUrls?: Record<number, string>;
}

/**
 * Service for watching and parsing EIP-7683 Open events
 * Protocol-agnostic - works with any EIP-7683 compliant settlement contract
 */
export class OpenEventWatcher {
    private readonly clientCache: Map<number, PublicClient> = new Map();

    constructor(private readonly dependencies?: OpenEventWatcherDependencies) {}

    private getPublicClient({ chain }: { chain: Chain }): PublicClient {
        if (this.dependencies?.publicClient) {
            return this.dependencies.publicClient;
        }

        if (this.clientCache.has(chain.id)) {
            return this.clientCache.get(chain.id)!;
        }

        const rpcUrl = this.dependencies?.rpcUrls?.[chain.id] || DEFAULT_PUBLIC_RPC_URLS[chain.id];

        const client = createPublicClient({
            chain,
            transport: http(rpcUrl),
        });

        this.clientCache.set(chain.id, client);
        return client;
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
        const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
        if (!chain) {
            throw new Error(`Unsupported chain ID: ${chainId}`);
        }

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

    /**
     * Parse Across-specific FundsDeposited event to get deposit ID
     * This is needed because Across uses depositId (not orderId) to match fills
     *
     * TODO: Abstract this for other protocols - each protocol may have different
     * ways to identify their deposits/orders on the destination chain
     *
     * @param txHash - Transaction hash to parse
     * @param chainId - Chain ID where the transaction occurred
     * @returns Deposit information needed for fill matching
     * @throws {DepositEventNotFoundError} If deposit event is not found
     */
    async getAcrossDepositInfo(txHash: Hex, chainId: number): Promise<DepositInfo> {
        const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
        if (!chain) {
            throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        const publicClient = this.getPublicClient({ chain });
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

        const FUNDS_DEPOSITED_SIGNATURE =
            "0x32ed1a409ef04c7b0227189c3a103dc5ac10e775a15b785dcc510201f7c25ad3";

        const depositLog = receipt.logs.find((log) => log.topics[0] === FUNDS_DEPOSITED_SIGNATURE);

        if (!depositLog) {
            throw new DepositEventNotFoundError(txHash, "Across");
        }

        const destinationChainId = BigInt(depositLog.topics[1] || "0");
        const depositId = BigInt(depositLog.topics[2] || "0");

        const [inputAmount, outputAmount] = parseAbiEncodedFields(depositLog.data, [2, 3]) as [
            bigint,
            bigint,
        ];

        return {
            depositId,
            inputAmount,
            outputAmount,
            destinationChainId,
        };
    }
}

import { Chain, createPublicClient, decodeEventLog, Hex, http, PublicClient } from "viem";

import {
    DepositInfo,
    OPEN_EVENT_ABI,
    OPEN_EVENT_SIGNATURE,
    OpenEvent,
    SUPPORTED_CHAINS,
} from "../internal.js";

/**
 * Error thrown when Open event is not found in transaction
 */
export class OpenEventNotFoundError extends Error {
    constructor(txHash: Hex) {
        super(`Open event not found in transaction ${txHash}`);
        this.name = "OpenEventNotFoundError";
    }
}

/**
 * Error thrown when Open event data is malformed
 */
export class InvalidOpenEventError extends Error {
    constructor(message: string) {
        super(`Invalid Open event: ${message}`);
        this.name = "InvalidOpenEventError";
    }
}

/**
 * Error thrown when protocol-specific deposit event is not found
 */
export class DepositEventNotFoundError extends Error {
    constructor(txHash: Hex, protocol: string) {
        super(`${protocol} deposit event not found in transaction ${txHash}`);
        this.name = "DepositEventNotFoundError";
    }
}

/**
 * Service for watching and parsing EIP-7683 Open events
 * Protocol-agnostic - works with any EIP-7683 compliant settlement contract
 */
export class OpenEventWatcher {
    private readonly clientCache: Map<number, PublicClient> = new Map();

    constructor(private readonly dependencies?: { publicClient?: PublicClient }) {}

    /**
     * Get or create a public client for a specific chain
     * Follows the same pattern as existing providers (e.g., AcrossProvider)
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
        const client = createPublicClient({
            chain,
            transport: http(),
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

        // Get transaction receipt
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

        // Find Open event by signature
        const openLog = receipt.logs.find((log) => log.topics[0] === OPEN_EVENT_SIGNATURE);

        if (!openLog) {
            throw new OpenEventNotFoundError(txHash);
        }

        try {
            // Decode Open event using EIP-7683 standard ABI
            const decoded = decodeEventLog({
                abi: OPEN_EVENT_ABI,
                data: openLog.data,
                topics: openLog.topics,
            });

            // Extract and validate data
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

        // FundsDeposited event signature (Across-specific)
        const FUNDS_DEPOSITED_SIGNATURE =
            "0x32ed1a409ef04c7b0227189c3a103dc5ac10e775a15b785dcc510201f7c25ad3";

        const depositLog = receipt.logs.find((log) => log.topics[0] === FUNDS_DEPOSITED_SIGNATURE);

        if (!depositLog) {
            throw new DepositEventNotFoundError(txHash, "Across");
        }

        // Extract key fields from FundsDeposited event
        // topics[1] = destinationChainId (indexed)
        // topics[2] = depositId (indexed)
        const destinationChainId = BigInt(depositLog.topics[1] || "0");
        const depositId = BigInt(depositLog.topics[2] || "0");

        // Decode data field to get amounts
        // Data contains: inputToken, outputToken, inputAmount, outputAmount, etc.
        // For simplicity, we'll extract just what we need
        const dataHex = depositLog.data;

        // inputToken (bytes32, 32 bytes)
        // outputToken (bytes32, 32 bytes)
        // inputAmount (uint256, 32 bytes) - starts at offset 64
        // outputAmount (uint256, 32 bytes) - starts at offset 96
        const inputAmount = BigInt(`0x${dataHex.slice(2 + 64 * 2, 2 + 65 * 2)}`);
        const outputAmount = BigInt(`0x${dataHex.slice(2 + 96 * 2, 2 + 97 * 2)}`);

        return {
            depositId,
            inputAmount,
            outputAmount,
            destinationChainId,
        };
    }
}

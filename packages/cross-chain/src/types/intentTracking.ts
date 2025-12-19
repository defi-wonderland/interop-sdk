import { Address, Hex } from "viem";

/**
 * Opened cross-chain intent parsed from an EIP-7683 Open event.
 *
 * Contains all data extracted from the standard EIP-7683 ResolvedCrossChainOrder struct:
 * - Basic order info (orderId, user, fillDeadline)
 * - Destination chain from fillInstructions
 * - Input/output amounts from maxSpent/minReceived
 *
 * This type represents a fully parsed intent ready for tracking.
 *
 * @see https://eips.ethereum.org/EIPS/eip-7683
 */
export interface OpenedIntent {
    /** Unique identifier for this order (bytes32) */
    orderId: Hex;
    /** Transaction hash where the order was opened */
    txHash: Hex;
    /** Block number where the order was opened */
    blockNumber: bigint;
    /** Contract that emitted the open event */
    originContract: Address;
    /** User who created the order */
    user: Address;
    /** Fill deadline timestamp (Unix seconds) */
    fillDeadline: number;
    /**
     * Protocol-specific deposit ID
     * Derived from orderId for compatibility with protocols like Across
     */
    depositId: bigint;
    /** Destination chain ID where the intent will be filled */
    destinationChainId: bigint;
    /** Input token amount (in smallest unit) from maxSpent[0] */
    inputAmount: bigint;
    /** Expected output token amount (in smallest unit) from minReceived[0] */
    outputAmount: bigint;
}

/**
 * Fill event data from destination chain
 * Protocol-specific implementation
 */
export interface FillEvent {
    /** Transaction hash where the fill occurred */
    fillTxHash: Hex;
    /** Block number where the fill occurred */
    blockNumber: bigint;
    /** Timestamp of the fill */
    timestamp: number;
    /** Origin chain ID */
    originChainId: number;
    /** Protocol-specific deposit/order ID */
    depositId: bigint;
    /** Relayer who filled the order */
    relayer: Address;
    /** Recipient of the filled order */
    recipient: Address;
}

/**
 * Intent lifecycle status
 * - opening: Parsing the transaction and Open event
 * - opened: Intent successfully opened and parsed
 * - filling: Waiting for relayer to fill on destination chain
 * - filled: Successfully filled on destination chain
 * - expired: Fill deadline passed without being filled
 */
export type IntentStatus = "opening" | "opened" | "filling" | "filled" | "expired";

/**
 * Complete intent status information
 */
export interface IntentStatusInfo {
    /** Current status of the intent */
    status: IntentStatus;
    /** Order ID */
    orderId: Hex;
    /** Transaction hash where order was opened */
    openTxHash: Hex;
    /** User who created the order */
    user: Address;
    /** Origin chain ID */
    originChainId: number;
    /** Destination chain ID */
    destinationChainId: number;
    /** Fill deadline timestamp */
    fillDeadline: number;
    /** Protocol-specific deposit ID */
    depositId: bigint;
    /** Input token amount from maxSpent[0] */
    inputAmount: bigint;
    /** Output token amount from minReceived[0] */
    outputAmount: bigint;
    /** Fill event data (present when status is 'filled') */
    fillEvent?: FillEvent;
}

/**
 * Intent update streamed during tracking
 * Used by async generator for real-time updates
 */
export interface IntentUpdate {
    /** Current status */
    status: IntentStatus;
    /** Order ID (available after intent is parsed) */
    orderId?: Hex;
    /** Transaction hash where order was opened */
    openTxHash: Hex;
    /** Fill transaction hash (available when filled) */
    fillTxHash?: Hex;
    /** Timestamp of the update (Unix timestamp in seconds) */
    timestamp: number;
    /** Human-readable message */
    message: string;
}

/**
 * Parameters for watching an intent
 */
export interface WatchIntentParams {
    /** Transaction hash where the order was opened */
    txHash: Hex;
    /** Origin chain ID */
    originChainId: number;
    /** Destination chain ID */
    destinationChainId: number;
    /** Timeout in milliseconds (default: 5 minutes) */
    timeout?: number;
    /** Polling interval in milliseconds (default: 5 seconds) */
    pollingInterval?: number;
}

/**
 * Parameters for getting fill status on destination chain
 */
export interface GetFillParams {
    /** Origin chain ID */
    originChainId: number;
    /** Destination chain ID */
    destinationChainId: number;
    /** Protocol-specific deposit ID */
    depositId: bigint;
    /** User address (for validation) */
    user: Address;
    /** Fill deadline timestamp */
    fillDeadline: number;
}

/**
 * Parameters for tracking an existing transaction (power user method)
 */
export interface TrackingParams {
    /** Transaction hash to track */
    txHash: Hex;
    /** Protocol name (e.g., 'across') */
    protocol: string;
    /** Origin chain ID */
    originChainId: number;
    /** Destination chain ID */
    destinationChainId: number;
    /** Optional timeout in milliseconds */
    timeout?: number;
}

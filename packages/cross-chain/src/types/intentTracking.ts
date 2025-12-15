import { Address, Hex } from "viem";

/**
 * Minimal representation of EIP-7683 ResolvedCrossChainOrder
 * Contains only the fields needed for intent tracking.
 *
 * NOTE: The full ResolvedCrossChainOrder contains additional fields:
 * - maxSpent: Output[] - Maximum tokens to spend on origin chain
 * - minReceived: Output[] - Minimum tokens to receive on destination chain
 * - fillInstructions: FillInstruction[] - Instructions for fillers
 *
 * These can be accessed from the raw event data if needed.
 */
export interface ResolvedCrossChainOrder {
    user: Address;
    originChainId: bigint;
    openDeadline: number;
    fillDeadline: number;
    orderId: Hex;
}

/**
 * EIP-7683 Open event data
 * Emitted when a cross-chain order is created on a settlement contract
 */
export interface OpenEvent {
    /** Unique identifier for this order (EIP-7683 standard) */
    orderId: Hex;
    /** Minimal resolved order details */
    resolvedOrder: ResolvedCrossChainOrder;
    /** Settlement contract that emitted the event */
    settlementContract: Address;
    /** Transaction hash where the order was opened */
    txHash: Hex;
    /** Block number where the order was opened */
    blockNumber: bigint;
}

/**
 * Protocol-specific deposit information
 * Used to match orders with fills on destination chain
 */
export interface DepositInfo {
    /** Protocol-specific deposit ID (e.g., Across depositId) */
    depositId: bigint;
    /** Input token amount */
    inputAmount: bigint;
    /** Expected output token amount */
    outputAmount: bigint;
    /** Destination chain ID */
    destinationChainId: bigint;
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
    /** EIP-7683 order ID */
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
    /** Protocol-specific deposit information */
    depositInfo?: DepositInfo;
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
    /** EIP-7683 order ID (available after Open event is parsed) */
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

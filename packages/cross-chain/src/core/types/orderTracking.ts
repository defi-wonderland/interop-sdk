import { OrderStatus } from "@openintentsframework/oif-specs";
import { Address, Hex } from "viem";

export { OrderStatus };

export const OrderFailureReason = {
    OriginTxReverted: "origin_tx_reverted",
    DeadlineExceeded: "deadline_exceeded",
    Unknown: "unknown",
} as const;

export type OrderFailureReason = (typeof OrderFailureReason)[keyof typeof OrderFailureReason];

/**
 * Token transfer structure from ERC-7683 spec
 * Represents a token transfer (can be used for both inputs and outputs)
 * @see https://www.erc7683.org/spec
 */
export interface TokenTransfer {
    /** Token address (bytes32 in spec, represented as Hex for addresses) */
    token: Hex;
    /** Token amount (in smallest unit) */
    amount: bigint;
    /** Recipient address (bytes32 in spec, represented as Hex for addresses) */
    recipient: Hex;
    /** Chain ID where this transfer exists/will be sent (uint256 in spec, but represented as number in SDK) */
    chainId: number;
}

/**
 * FillInstruction structure from ERC-7683 spec
 * Parameterizes how to fill an order on destination chain
 * @see https://www.erc7683.org/spec
 */
export interface FillInstruction {
    /** Destination chain ID where fill will occur (uint256 in spec, but represented as number in SDK) */
    destinationChainId: number;
    /** Destination settler contract address (bytes32 in spec) */
    destinationSettler: Hex;
    /** Origin data passed to fill (protocol-specific) */
    originData: Hex;
}

export const OrderTrackerYieldType = {
    Update: "update",
    Timeout: "timeout",
} as const;

export type OrderTrackerYieldType =
    (typeof OrderTrackerYieldType)[keyof typeof OrderTrackerYieldType];

/**
 * Opened cross-chain intent parsed from an ERC-7683 Open event.
 *
 * This interface closely follows the ERC-7683 ResolvedCrossChainOrder structure
 * with additional SDK metadata fields for tracking.
 *
 * @see https://www.erc7683.org/spec - ResolvedCrossChainOrder
 */
export interface OpenedIntent {
    /**
     * ERC-7683 ResolvedCrossChainOrder fields
     */
    /** User who created the order (address in spec) */
    user: Address;
    /** Origin chain ID (uint256 in spec, but represented as number in SDK) */
    originChainId: number;
    /** Open deadline timestamp in Unix seconds (uint32 in spec) */
    openDeadline: number;
    /** Fill deadline timestamp in Unix seconds (uint32 in spec) */
    fillDeadline: number;
    /** Unique order identifier (bytes32 in spec) */
    orderId: Hex;
    /** Maximum outputs that the filler will send (caps on liabilities) */
    maxSpent: TokenTransfer[];
    /** Minimum amounts the user must receive (floors on receipts) */
    minReceived: TokenTransfer[];
    /** Fill instructions for destination chain(s) */
    fillInstructions: FillInstruction[];
    /**
     * SDK metadata fields (not in ERC-7683)
     */
    /** Transaction hash where the order was opened */
    txHash: Hex;
    /** Block number where the order was opened */
    blockNumber: bigint;
    /** Contract that emitted the open event */
    originContract: Address;
}

/**
 * Fill event data from destination chain
 * Aligned with ERC-7683 terminology
 */
export interface FillEvent<TMetadata = unknown> {
    /** Transaction hash where the fill occurred */
    fillTxHash: Hex;
    /** Block number where the fill occurred */
    blockNumber?: bigint;
    /** Timestamp of the fill */
    timestamp: number;
    /** Origin chain ID */
    originChainId: number;
    /** ERC-7683 order identifier (bytes32) */
    orderId: Hex;
    /** Relayer/filler who executed the order */
    relayer?: Address;
    /** Recipient of the filled order */
    recipient?: Address;
    /**
     * Optional metadata from API responses
     * Can include: solver info, fees, routes, multi-hop data, etc.
     */
    metadata?: TMetadata;
}

/**
 * Complete order tracking information (final observed state)
 * Combines ERC-7683 order data with SDK tracking status
 */
export interface OrderTrackingInfo<TMetadata = unknown> {
    status: OrderStatus;
    /** ERC-7683 order identifier */
    orderId: Hex;
    /** Transaction hash where order was opened */
    openTxHash: Hex;
    /** User who created the order */
    user: Address;
    /** Origin chain ID */
    originChainId: number;
    /** Open deadline timestamp */
    openDeadline: number;
    /** Fill deadline timestamp */
    fillDeadline: number;
    /** Maximum outputs that the filler will send */
    maxSpent: TokenTransfer[];
    /** Minimum amounts the user must receive */
    minReceived: TokenTransfer[];
    /** Fill instructions for destination chain(s) */
    fillInstructions: FillInstruction[];
    /** Fill event data (present when status is Finalized) */
    fillEvent?: FillEvent<TMetadata>;
    /** Reason for failure (present when status is Failed) */
    failureReason?: OrderFailureReason;
}

/**
 * Order update streamed during tracking.
 * Used by async generator for real-time updates.
 */
export interface OrderTrackingUpdate {
    status: OrderStatus;
    /** Order ID (available after order is parsed, or immediately for escrow orders) */
    orderId?: Hex;
    /** Transaction hash where order was opened (undefined for escrow orders) */
    openTxHash?: Hex;
    /** Fill transaction hash (available when completed) */
    fillTxHash?: Hex;
    /** Timestamp of the update (Unix timestamp in seconds) */
    timestamp: number;
    /** Human-readable message */
    message: string;
    /** Reason for failure (present when status is Failed) */
    failureReason?: OrderFailureReason;
}

/**
 * Timeout payload yielded/emitted when tracking times out before a terminal status.
 */
export interface OrderTrackerTimeoutPayload {
    lastUpdate: OrderTrackingUpdate;
    timestamp: number;
    message: string;
}

/**
 * Discriminated union yielded by watchOrder() generator.
 */
export type OrderTrackerYield =
    | { type: typeof OrderTrackerYieldType.Update; update: OrderTrackingUpdate }
    | { type: typeof OrderTrackerYieldType.Timeout; payload: OrderTrackerTimeoutPayload };

interface WatchOrderBase {
    /** Origin chain ID */
    originChainId: number;
    /** Timeout in milliseconds (default: 5 minutes) */
    timeout?: number;
    /** Polling interval in milliseconds (default: 5 seconds) */
    pollingInterval?: number;
}

/** Watch by txHash (user-open orders) */
export interface WatchOrderByTxHash extends WatchOrderBase {
    /** Transaction hash where the order was opened */
    txHash: Hex;
    orderId?: never;
    /** Optional - extracted from parsed order's fillInstructions */
    destinationChainId?: number;
}

/** Watch by orderId (escrow orders) */
export interface WatchOrderByOrderId extends WatchOrderBase {
    txHash?: never;
    /** Order ID from submitSignedOrder() */
    orderId: Hex;
    /** Required - no order to parse */
    destinationChainId: number;
    /** Optional deposit tx hash, passed to fill watcher for solver notification */
    openTxHash?: Hex;
}

/** Pass txHash for user-open orders, orderId for escrow orders */
export type WatchOrderParams = WatchOrderByTxHash | WatchOrderByOrderId;

/**
 * Parameters for getting fill status on destination chain
 * Aligned with ERC-7683 terminology
 */
export interface GetFillParams {
    /** ERC-7683 order identifier (bytes32) */
    orderId: Hex;
    /** Transaction hash where the order was opened. Optional for escrow orders. */
    openTxHash?: Hex;
    /** Origin chain ID */
    originChainId: number;
    /** Destination chain ID */
    destinationChainId: number;
    /** User address. Optional for OIF escrow orders. */
    user?: Address;
    /** Fill deadline timestamp. Optional for OIF escrow orders. */
    fillDeadline?: number;
}

/**
 * Parameters for tracking an existing order (power user method)
 */
export interface OrderTrackingParams {
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

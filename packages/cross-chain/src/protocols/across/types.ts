/**
 * Across Protocol API Type Definitions
 * Types for interacting with Across Protocol's REST API
 * @see https://docs.across.to/reference/api-reference
 */

/**
 * Across API Deposit Status Response
 * From: GET https://app.across.to/api/deposit/status
 * @description Response structure from Across API for tracking deposit fill status
 * @see https://docs.across.to/reference/api-reference#get-deposit-status
 */
export interface AcrossDepositStatusResponse {
    /** Deposit status */
    status: "filled" | "pending" | "expired" | "refunded" | "slowFillRequested";
    /** The transaction hash of the fill transaction (only present when status is filled) */
    fillTxnRef?: string;
    /** Chain ID where the fill transaction took place */
    destinationChainId: number;
    /** Chain ID where the deposit transaction originally took place */
    originChainId: number;
    /** Deposit ID from V3FundsDeposited event */
    depositId: number;
    /** Deposit transaction hash */
    depositTxnRef: string;
    /** Deposit refund transaction hash */
    depositRefundTxnRef?: string;
    /** Whether the actions succeeded */
    actionsSucceeded?: boolean;
    /** Pagination object with currentIndex and maxIndex */
    pagination?: {
        currentIndex: number;
        maxIndex: number;
    };
}

/**
 * Extended metadata for Across API responses
 * Captures additional data beyond basic FillEvent for enriched tracking
 */
export interface AcrossMetadata {
    /** Relayer/solver name if available */
    relayerName?: string;
    /** Whether actions succeeded */
    actionsSucceeded?: boolean;
}

import type { Address, Hex } from "viem";

import type { Intent } from "./intent.js";

export interface SwapQuoteRequest {
    user: Address;
    input: { chainId: number; token: Address; amount: bigint };
    output: { chainId: number; token: Address; minAmount?: bigint };
    swapType?: "exact-input" | "exact-output";
    recipient?: Address;
}

export interface ApprovalRequirement {
    token: Address;
    spender: Address;
    amount: bigint;
}

export interface SwapQuote {
    quoteId: string;
    protocol: string;
    variant: string;
    submission: "tx" | "sign";
    input: { chainId: number; token: Address; amount: bigint };
    output: { chainId: number; token: Address; amount: bigint };
    eta?: number;
    expiry?: number;
    approvals?: ApprovalRequirement[];
    signPayload?: {
        domain: Record<string, unknown>;
        types: Record<string, Array<{ name: string; type: string }>>;
        primaryType: string;
        message: Record<string, unknown>;
    };
}

export type SwapOrderStatus =
    | "submitted"
    | "pending"
    | "filling"
    | "filled"
    | "settled"
    | "finalized"
    | "failed"
    | "expired"
    | "refunded";

export interface SwapOrderUpdate {
    status: SwapOrderStatus;
    timestamp: number;
    message?: string;
    orderId?: string;
    fillTxHash?: Hex;
    failureReason?: string;
}

export type SwapIntent = Intent<SwapQuoteRequest, SwapQuote, SwapOrderUpdate>;

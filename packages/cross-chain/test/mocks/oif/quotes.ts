import type { GetQuoteResponse, Quote } from "@openintentsframework/oif-specs";
import type { Hex } from "viem";
import { hexToBytes } from "viem";

import {
    OIF_ADDRESSES,
    OIF_AMOUNTS,
    OIF_ATTACKER_ADDRESSES,
    OIF_ATTACKER_INTEROP_ADDRESSES,
    OIF_INTEROP_ADDRESSES,
} from "../fixtures.js";

// =============================================================================
// Constants
// =============================================================================

const QUOTE_IDS = {
    ESCROW: "test-quote-escrow",
    RESOURCE_LOCK: "test-quote-resource-lock",
    EIP3009: "test-quote-3009",
    USER_OPEN: "test-quote-user-open",
} as const;

// Future timestamps for tests (relative to current time)
function getTimestamps(): { VALID_UNTIL: number; DEADLINE: number } {
    const now = Math.floor(Date.now() / 1000);
    return {
        VALID_UNTIL: now + 600, // 10 minutes from now
        DEADLINE: now + 1800, // 30 minutes from now
    };
}

// Shared quote metadata
function baseQuoteFields(quoteId: string): Omit<Quote, "order"> {
    return {
        preview: {
            inputs: [
                {
                    user: OIF_INTEROP_ADDRESSES.USER,
                    asset: OIF_INTEROP_ADDRESSES.TOKEN,
                    amount: OIF_AMOUNTS.INPUT,
                },
            ],
            outputs: [
                {
                    receiver: OIF_INTEROP_ADDRESSES.USER,
                    asset: OIF_INTEROP_ADDRESSES.OUTPUT_ASSET,
                    amount: OIF_AMOUNTS.OUTPUT,
                },
            ],
        },
        validUntil: getTimestamps().VALID_UNTIL,
        eta: 30,
        quoteId,
        provider: "test-solver",
        failureHandling: "refund-automatic",
        partialFill: false,
        metadata: { fees: { total: OIF_AMOUNTS.FEE } },
    };
}

// =============================================================================
// oif-escrow-v0 (Permit2) - User signs token transfer permission
// ATTACK VECTOR: Tampering with permitted[].token or permitted[].amount
// =============================================================================

export interface EscrowOverrides {
    /** Override token in message.permitted (20-byte address) */
    token?: string;
    /** Override amount in message.permitted */
    amount?: string;
}

export function getMockedOifQuoteResponse(overrides?: EscrowOverrides): GetQuoteResponse {
    return {
        quotes: [
            {
                order: {
                    type: "oif-escrow-v0",
                    payload: {
                        signatureType: "eip712",
                        domain: {
                            name: "Permit2",
                            version: "1",
                            chainId: 1,
                            verifyingContract: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
                        },
                        primaryType: "PermitBatchWitnessTransferFrom",
                        message: {
                            permitted: [
                                {
                                    token: overrides?.token ?? OIF_ADDRESSES.TOKEN,
                                    amount: overrides?.amount ?? OIF_AMOUNTS.INPUT,
                                },
                            ],
                            spender: OIF_ADDRESSES.SPENDER,
                            nonce: "123",
                            deadline: getTimestamps().DEADLINE,
                        },
                        types: {
                            PermitBatchWitnessTransferFrom: [
                                { name: "permitted", type: "TokenPermissions[]" },
                                { name: "spender", type: "address" },
                                { name: "nonce", type: "uint256" },
                                { name: "deadline", type: "uint256" },
                            ],
                            TokenPermissions: [
                                { name: "token", type: "address" },
                                { name: "amount", type: "uint256" },
                            ],
                        },
                    },
                },
                ...baseQuoteFields(QUOTE_IDS.ESCROW),
            },
        ],
    };
}

// =============================================================================
// oif-resource-lock-v0 (BatchCompact) - User locks resources with arbiter
// ATTACK VECTOR: Tampering with commitments[].token, amount, or sponsor
// =============================================================================

export interface ResourceLockOverrides {
    /** Override token in commitments (20-byte address) */
    token?: string;
    /** Override amount in commitments */
    amount?: string;
    /** Override sponsor address (20-byte address) */
    sponsor?: string;
}

export function getMockedOifResourceLockQuoteResponse(
    overrides?: ResourceLockOverrides,
): GetQuoteResponse {
    return {
        quotes: [
            {
                order: {
                    type: "oif-resource-lock-v0",
                    payload: {
                        signatureType: "eip712",
                        domain: {
                            name: "TheCompact",
                            version: "1",
                            chainId: 1,
                            verifyingContract: "0x00000000000018DF021Ff2467dF97ff846E09f48",
                        },
                        primaryType: "BatchCompact",
                        message: {
                            arbiter: OIF_ADDRESSES.SPENDER,
                            sponsor: overrides?.sponsor ?? OIF_ADDRESSES.USER,
                            nonce: "123",
                            expires: getTimestamps().DEADLINE,
                            id: "456",
                            commitments: [
                                {
                                    token: overrides?.token ?? OIF_ADDRESSES.TOKEN,
                                    amount: overrides?.amount ?? OIF_AMOUNTS.INPUT,
                                },
                            ],
                        },
                        types: {
                            BatchCompact: [
                                { name: "arbiter", type: "address" },
                                { name: "sponsor", type: "address" },
                                { name: "nonce", type: "uint256" },
                                { name: "expires", type: "uint256" },
                                { name: "id", type: "uint256" },
                                { name: "commitments", type: "Commitment[]" },
                            ],
                            Commitment: [
                                { name: "token", type: "address" },
                                { name: "amount", type: "uint256" },
                            ],
                        },
                    },
                },
                ...baseQuoteFields(QUOTE_IDS.RESOURCE_LOCK),
            },
        ],
    };
}

// =============================================================================
// oif-3009-v0 (TransferWithAuthorization) - User authorizes ERC-3009 transfer
// ATTACK VECTOR: Tampering with from, value, or metadata.inputs
// =============================================================================

export interface Eip3009Overrides {
    /** Override from address in message (20-byte address) */
    from?: string;
    /** Override value in message */
    value?: string;
    /** Override tokenAddress in metadata (20-byte address) */
    tokenAddress?: string;
}

export function getMockedOif3009QuoteResponse(overrides?: Eip3009Overrides): GetQuoteResponse {
    const tokenAddress = overrides?.tokenAddress ?? OIF_ADDRESSES.TOKEN;

    return {
        quotes: [
            {
                order: {
                    type: "oif-3009-v0",
                    payload: {
                        signatureType: "eip712",
                        domain: {
                            name: "USD Coin",
                            version: "2",
                            chainId: 1,
                            verifyingContract: OIF_ADDRESSES.TOKEN,
                        },
                        primaryType: "TransferWithAuthorization",
                        message: {
                            from: overrides?.from ?? OIF_ADDRESSES.USER,
                            to: OIF_ADDRESSES.SPENDER,
                            value: overrides?.value ?? OIF_AMOUNTS.INPUT,
                            validAfter: 0,
                            validBefore: getTimestamps().DEADLINE,
                            nonce: "0x" + "00".repeat(32),
                        },
                        types: {
                            TransferWithAuthorization: [
                                { name: "from", type: "address" },
                                { name: "to", type: "address" },
                                { name: "value", type: "uint256" },
                                { name: "validAfter", type: "uint256" },
                                { name: "validBefore", type: "uint256" },
                                { name: "nonce", type: "bytes32" },
                            ],
                        },
                    },
                    // Per OIF spec example: metadata has orderHash, chainId, tokenAddress
                    metadata: {
                        orderHash: "0x" + "ab".repeat(32),
                        chainId: 1,
                        tokenAddress: tokenAddress,
                    },
                },
                ...baseQuoteFields(QUOTE_IDS.EIP3009),
            },
        ],
    };
}

// =============================================================================
// oif-user-open-v0 (Direct Transaction) - User sends tx to settlement contract
// ATTACK VECTOR: Mismatch openIntentTx.to vs allowances.spender,
//                or tampering with allowances (token, user, spender, required)
// =============================================================================

export interface UserOpenOverrides {
    /** Override openIntentTx.to (different contract) */
    txTo?: string;
    /** Override allowances.token */
    allowanceToken?: string;
    /** Override allowances.user */
    allowanceUser?: string;
    /** Override allowances.spender (mismatch with txTo) */
    allowanceSpender?: string;
    /** Override allowances.required (drain more tokens) */
    allowanceRequired?: string;
}

export function getMockedOifUserOpenQuoteResponse(overrides?: UserOpenOverrides): GetQuoteResponse {
    const settlementCalldata = "0xabcdef1234567890" as Hex;
    const txTo = overrides?.txTo ?? OIF_INTEROP_ADDRESSES.SPENDER;
    const allowanceSpender = overrides?.allowanceSpender ?? OIF_INTEROP_ADDRESSES.SPENDER;

    return {
        quotes: [
            {
                order: {
                    type: "oif-user-open-v0",
                    openIntentTx: {
                        to: txTo,
                        data: hexToBytes(settlementCalldata),
                        gasRequired: "250000",
                    },
                    checks: {
                        allowances: [
                            {
                                token: overrides?.allowanceToken ?? OIF_INTEROP_ADDRESSES.TOKEN,
                                user: overrides?.allowanceUser ?? OIF_INTEROP_ADDRESSES.USER,
                                spender: allowanceSpender,
                                required: overrides?.allowanceRequired ?? OIF_AMOUNTS.INPUT,
                            },
                        ],
                    },
                },
                ...baseQuoteFields(QUOTE_IDS.USER_OPEN),
            },
        ],
    };
}

// Re-exports for test utilities
export { OIF_ATTACKER_ADDRESSES as ATTACKER_ADDRESSES };
export { OIF_ATTACKER_INTEROP_ADDRESSES as ATTACKER_INTEROP_ADDRESSES };
export { OIF_AMOUNTS as AMOUNTS };

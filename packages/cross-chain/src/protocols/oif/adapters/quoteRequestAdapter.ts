/**
 * Converts SDK {@link QuoteRequest} to OIF wire-format `GetQuoteRequest`.
 *
 * This is the inbound boundary: user-friendly types → protocol types.
 */

import type { GetQuoteRequest } from "@openintentsframework/oif-specs";

import type { QuoteRequest } from "../../../core/schemas/quoteRequest.js";
import { fromInteropAccountId } from "../../../core/utils/interopAccountId.js";

/**
 * Options passed from the provider to control OIF-specific request behaviour.
 * These come from `OifProviderConfig`, not from the per-request `QuoteRequest`.
 */
export interface AdaptOptions {
    /** Lock mechanisms to request from solver (default: all) */
    supportedLocks?: string[];
    /** Submission modes: "user-transaction" vs "gasless". Default: all */
    submissionModes?: ("user-transaction" | "gasless")[];
}

/**
 * Maps SDK lock mechanism names to the OIF order type strings that use them.
 *
 * - `"oif-escrow"` → permit2-based escrow + EIP-3009 authorization
 * - `"compact-resource-lock"` → Compact resource locking
 *
 * `oif-user-open-v0` is handled separately via `submissionModes`.
 */
const LOCK_TO_ORDER_TYPES: Record<string, string[]> = {
    "oif-escrow": ["oif-escrow-v0", "oif-3009-v0"],
    "compact-resource-lock": ["oif-resource-lock-v0"],
};

/** All known OIF order types (used when no lock filter is specified). */
const ALL_OIF_ORDER_TYPES = [
    "oif-escrow-v0",
    "oif-3009-v0",
    "oif-resource-lock-v0",
    "oif-user-open-v0",
];

/** Gasless (signature-based) order types */
const GASLESS_ORDER_TYPES = new Set(["oif-escrow-v0", "oif-3009-v0", "oif-resource-lock-v0"]);

function toSupportedTypes(options?: AdaptOptions): string[] {
    const { supportedLocks, submissionModes } = options ?? {};

    // Step 1: Determine base types from lock filter
    let types: Set<string>;
    if (!supportedLocks || supportedLocks.length === 0) {
        types = new Set(ALL_OIF_ORDER_TYPES);
    } else {
        types = new Set<string>();
        types.add("oif-user-open-v0");
        for (const lock of supportedLocks) {
            const mapped = LOCK_TO_ORDER_TYPES[lock];
            if (mapped) {
                for (const t of mapped) types.add(t);
            }
        }
    }

    // Step 2: Filter by submission mode
    if (submissionModes && submissionModes.length > 0) {
        const allowUserTx = submissionModes.includes("user-transaction");
        const allowGasless = submissionModes.includes("gasless");

        if (!allowUserTx) {
            types.delete("oif-user-open-v0");
        }
        if (!allowGasless) {
            for (const t of types) {
                if (GASLESS_ORDER_TYPES.has(t)) types.delete(t);
            }
        }
    }

    return [...types];
}

/**
 * Convert an SDK {@link QuoteRequest} to an OIF `GetQuoteRequest`.
 *
 * - Encodes `InteropAccountId` fields to ERC-7930 hex
 * - Derives `inputs[].user` from the top-level `user` address + input chain
 * - Defaults `outputs[].recipient` to user on the output chain
 * - Maps `supportedLocks` + `submissionModes` from options → `supportedTypes`
 */
export function adaptQuoteRequest(request: QuoteRequest, options?: AdaptOptions): GetQuoteRequest {
    const { input, output } = request;

    const userOnInputChain = fromInteropAccountId({
        chainId: input.chainId,
        address: request.user,
    });

    const inputs = [
        {
            user: userOnInputChain,
            asset: fromInteropAccountId({ chainId: input.chainId, address: input.assetAddress }),
            ...(input.amount !== undefined && { amount: input.amount }),
        },
    ];

    const recipientAddress = output.recipient ?? request.user;

    const outputs = [
        {
            receiver: fromInteropAccountId({ chainId: output.chainId, address: recipientAddress }),
            asset: fromInteropAccountId({ chainId: output.chainId, address: output.assetAddress }),
            ...(output.amount !== undefined && { amount: output.amount }),
            ...(output.calldata !== undefined && { calldata: output.calldata }),
        },
    ];

    return {
        user: userOnInputChain,
        intent: {
            intentType: "oif-swap" as const,
            inputs,
            outputs,
            swapType: request.swapType ?? "exact-input",
        },
        supportedTypes: toSupportedTypes(options),
    };
}

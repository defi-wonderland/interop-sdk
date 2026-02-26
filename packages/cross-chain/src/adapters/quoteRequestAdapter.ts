/**
 * Converts SDK {@link QuoteRequest} to OIF wire-format `GetQuoteRequest`.
 *
 * This is the inbound boundary: user-friendly types → protocol types.
 */

import type { GetQuoteRequest } from "@openintentsframework/oif-specs";

import type { QuoteRequest } from "../types/quoteRequest.js";
import { fromInteropAccountId } from "../utils/interopAccountId.js";

/**
 * Maps SDK lock mechanism names to the OIF order type strings that use them.
 *
 * - `"oif-escrow"` → permit2-based escrow + EIP-3009 authorization (both use escrow settlement)
 * - `"compact-resource-lock"` → Compact resource locking
 *
 * `oif-user-open-v0` is always included (no lock mechanism; user submits tx directly).
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

function lockNamesToSupportedTypes(supportedLocks?: string[]): string[] {
    if (!supportedLocks || supportedLocks.length === 0) {
        return ALL_OIF_ORDER_TYPES;
    }

    const types = new Set<string>();
    // user-open is always available (no lock required)
    types.add("oif-user-open-v0");

    for (const lock of supportedLocks) {
        const mapped = LOCK_TO_ORDER_TYPES[lock];
        if (mapped) {
            for (const t of mapped) types.add(t);
        }
    }

    return [...types];
}

/**
 * Convert an SDK {@link QuoteRequest} to an OIF `GetQuoteRequest`.
 *
 * - Encodes `InteropAccountId` fields to ERC-7930 hex
 * - Derives `inputs[].user` from the top-level `user`
 * - Defaults `outputs[].recipient` to user on the output chain
 * - Maps `supportedLocks` → `supportedTypes`
 */
export function adaptQuoteRequest(request: QuoteRequest): GetQuoteRequest {
    const userHex = fromInteropAccountId(request.user);

    const inputs = request.intent.inputs.map((input) => ({
        user: fromInteropAccountId({
            chainId: input.asset.chainId,
            address: request.user.address,
        }),
        asset: fromInteropAccountId(input.asset),
        ...(input.amount !== undefined && { amount: input.amount }),
    }));

    const outputs = request.intent.outputs.map((output) => {
        const recipient = output.recipient ?? {
            chainId: output.asset.chainId,
            address: request.user.address,
        };
        return {
            receiver: fromInteropAccountId(recipient),
            asset: fromInteropAccountId(output.asset),
            ...(output.amount !== undefined && { amount: output.amount }),
            ...(output.calldata !== undefined && { calldata: output.calldata }),
        };
    });

    return {
        user: userHex,
        intent: {
            intentType: "oif-swap" as const,
            inputs,
            outputs,
            swapType: request.intent.swapType ?? "exact-input",
        },
        supportedTypes: lockNamesToSupportedTypes(request.supportedLocks),
    };
}

/**
 * Typed Data Adapter (#286)
 * @see https://github.com/openintentsframework/oif-solver/issues/286
 * @see https://github.com/openintentsframework/oif-solver/issues/289
 *
 * TEMPORARY - Solver returns order.payload with EIP-712 issues that break signing.
 * Payload is NOT part of the HMAC integrity checksum, so safe to fix client-side.
 */

import type { EIP712Types, Quote } from "@openintentsframework/oif-specs";

import { isSignableOifOrder } from "../../../core/utils/orderTypeHelpers.js";
import { EIP3009_TYPES, PERMIT2_TYPES } from "../constants.js";

const CANONICAL_TYPES: Record<string, EIP712Types> = {
    "oif-escrow-v0": PERMIT2_TYPES,
    "oif-3009-v0": EIP3009_TYPES,
};

const DOMAIN_REQUIRES_VERSION = new Set(["oif-3009-v0", "oif-resource-lock-v0"]);

export function adaptTypedDataPayload(quote: Quote): Quote {
    if (!isSignableOifOrder(quote.order)) return quote;

    const { payload } = quote.order;
    const domain = { ...(payload.domain as Record<string, unknown>) };

    // #286: Solver sends chainId as string, viem produces wrong domain separator hash
    if (typeof domain.chainId === "string") {
        domain.chainId = Number(domain.chainId);
    }

    // #286: 3009/resource-lock need version in domain (USDC has version: '1'),
    // but escrow (Permit2) must NOT have it
    if (DOMAIN_REQUIRES_VERSION.has(quote.order.type)) {
        domain.version = domain.version ?? "1";
    } else {
        delete domain.version;
    }

    return {
        ...quote,
        order: {
            ...quote.order,
            payload: {
                ...payload,
                domain,
                // #286: Solver-provided types are incomplete, use canonical
                types: CANONICAL_TYPES[quote.order.type] ?? payload.types,
            },
        },
    } as Quote;
}

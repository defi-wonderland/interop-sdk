/**
 * Typed Data Adapter (#286)
 * TEMPORARY - Solver missing 'version' field in domain, viem requires it.
 * @see https://github.com/openintentsframework/oif-solver/issues/286
 */

import type { Quote } from "@openintentsframework/oif-specs";
import type { z } from "zod";

import type {
    oif3009OrderSchema,
    oifEscrowOrderSchema,
    oifResourceLockOrderSchema,
} from "../schemas/oif.js";
import { isSignableOifOrder } from "../utils/orderTypeHelpers.js";

/** Union of all signable OIF order types */
type SignableOrder =
    | z.infer<typeof oifEscrowOrderSchema>
    | z.infer<typeof oif3009OrderSchema>
    | z.infer<typeof oifResourceLockOrderSchema>;

/** EIP-712 payload structure shared by all signable OIF orders */
type SignableOrderPayload = SignableOrder["payload"];

/**
 * Fix typed data payload for viem compatibility (#286)
 * Adds missing 'version' field (solver should include per oif-specs)
 */
export function adaptTypedDataPayload(quote: Quote): Quote {
    if (!isSignableOifOrder(quote.order)) return quote;

    const { payload } = quote.order as { payload?: SignableOrderPayload };
    if (!payload) return quote;

    const fixedPayload: SignableOrderPayload = {
        ...payload,
        domain: {
            ...payload.domain,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            version: payload.domain.version ?? "1",
        },
    };

    return {
        ...quote,
        order: { ...quote.order, payload: fixedPayload },
    } as Quote;
}

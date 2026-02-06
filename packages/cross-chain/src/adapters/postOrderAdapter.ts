/**
 * Post Order Adapter (#34, #109)
 * @see https://github.com/openintentsframework/oif-specs/issues/34
 * @see https://github.com/openintentsframework/oif-aggregator/issues/109
 *
 * TEMPORARY - OIF solver expects different request format than oif-specs PostOrderRequest
 */

import type { PostOrderRequest } from "@openintentsframework/oif-specs";
import type { Hex } from "viem";

import type { ExecutableQuote } from "../interfaces/quotes.interface.js";
import { prefixSignatureForOrderType } from "./signaturePrefixAdapter.js";

/**
 * TEMPORARY: Current OIF solver request format (#109)
 * Will be replaced by oif-specs PostOrderRequest when solver is updated
 */
interface OifSolverPostOrderRequest {
    quoteResponse: Omit<ExecutableQuote, "preparedTransaction">;
    signature: Hex;
}

/** Adapts oif-specs PostOrderRequest to current OIF solver format */
export function adaptPostOrderRequest(
    request: PostOrderRequest,
    originalQuote: ExecutableQuote,
): OifSolverPostOrderRequest {
    const signatureHex = `0x${Buffer.from(request.signature).toString("hex")}` as Hex;

    // #34: Add signature prefix
    const prefixedSignature = prefixSignatureForOrderType(signatureHex, request.order.type);

    // #109: OIF expects { quoteResponse, signature } not { order, signature, quoteId }
    const { preparedTransaction, ...quoteForSolver } = originalQuote;

    return {
        quoteResponse: quoteForSolver,
        signature: prefixedSignature,
    };
}

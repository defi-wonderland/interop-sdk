import type { Hex } from "viem";

import type { Quote, SubmitOrderResponse } from "../../../internal.js";
import type {
    BungeeAutoRoute,
    BungeeSubmitRequest,
    BungeeSubmitResponse,
    BungeeSubmitResult,
} from "../schemas.js";
import { ProviderExecuteFailure } from "../../../internal.js";

/** Result of building a Bungee submit request. */
export interface BungeeSubmitPayload {
    /** The Bungee submit API request body. */
    request: BungeeSubmitRequest;
    /** The auto route extracted from quote metadata, needed for response adaptation. */
    autoRoute: BungeeAutoRoute;
}

/**
 * Build a Bungee submit request from an SDK quote and user signature.
 *
 * Extracts the witness, requestType, and quoteId from the auto route
 * metadata stashed during {@link adaptQuotes}.
 *
 * @param quote - The SDK quote containing Bungee metadata.
 * @param signature - The user's EIP-712 signature.
 * @throws {ProviderExecuteFailure} When Bungee auto route metadata is missing.
 */
export function buildSubmitRequest(quote: Quote, signature: Hex): BungeeSubmitPayload {
    const autoRoute = quote.metadata?.bungeeAutoRoute as BungeeAutoRoute | undefined;
    if (!autoRoute) {
        throw new ProviderExecuteFailure("Missing Bungee auto route metadata for submit");
    }

    return {
        request: {
            request: (autoRoute.signTypedData?.values?.witness ?? {}) as Record<string, unknown>,
            userSignature: signature,
            requestType: autoRoute.requestType as "SINGLE_OUTPUT_REQUEST" | "SWAP_REQUEST",
            quoteId: autoRoute.quoteId,
        },
        autoRoute,
    };
}

/**
 * Adapt a Bungee submit response into an SDK SubmitOrderResponse.
 *
 * Extracts the order hash from the response result, falling back to
 * the requestHash from the original auto route metadata.
 *
 * @param response - The Bungee submit API response.
 * @param autoRoute - The auto route from the original quote, used as hash fallback.
 */
export function adaptSubmitResponse(
    response: BungeeSubmitResponse,
    autoRoute: BungeeAutoRoute,
): SubmitOrderResponse {
    const orderId = extractOrderHash(response) ?? autoRoute.requestHash;

    return {
        orderId: orderId as Hex,
        status: response.success ? "submitted" : "failed",
        message: response.message ?? undefined,
    };
}

/** Extract the order hash from the submit response result. */
function extractOrderHash(response: BungeeSubmitResponse): string | undefined {
    const { result } = response;
    const entry: BungeeSubmitResult | undefined = Array.isArray(result) ? result[0] : result;
    return entry?.hash ?? entry?.requestHash;
}

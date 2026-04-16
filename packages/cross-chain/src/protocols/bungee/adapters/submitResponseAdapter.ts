import type { Hex } from "viem";

import type { SubmitOrderResponse } from "../../../internal.js";
import type { BungeeAutoRoute, BungeeSubmitResponse, BungeeSubmitResult } from "../schemas.js";

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

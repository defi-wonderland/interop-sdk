import type { QuoteRequest } from "../../../core/schemas/quoteRequest.js";
import type { SuperbridgeRoutesRequest } from "../schemas.js";
import {
    NATIVE_ZERO_ADDRESS,
    ProviderGetQuoteFailure,
    withNativePlaceholder,
} from "../../../internal.js";
import { SUPERBRIDGE_CANONICAL_ROUTE_IDS, SUPERBRIDGE_DEFAULT_SLIPPAGE } from "../constants.js";
import { SuperbridgeRoutesRequestSchema } from "../schemas.js";

/**
 * Convert an SDK QuoteRequest into a Superbridge `/v1/routes` request body.
 *
 * @throws {ProviderGetQuoteFailure} When the required input amount is missing.
 */
export function adaptQuoteRequest(params: QuoteRequest): SuperbridgeRoutesRequest {
    const amount = params.input.amount;
    if (!amount) {
        throw new ProviderGetQuoteFailure("Superbridge requires input.amount to be defined");
    }

    return SuperbridgeRoutesRequestSchema.parse({
        fromChainId: String(params.input.chainId),
        toChainId: String(params.output.chainId),
        fromTokenAddress: withNativePlaceholder(
            params.input.assetAddress,
            "eip155",
            NATIVE_ZERO_ADDRESS,
        ),
        toTokenAddress: withNativePlaceholder(
            params.output.assetAddress,
            "eip155",
            NATIVE_ZERO_ADDRESS,
        ),
        amount,
        sender: params.user,
        recipient: params.output.recipient ?? params.user,
        slippage: SUPERBRIDGE_DEFAULT_SLIPPAGE,
        routeIds: [...SUPERBRIDGE_CANONICAL_ROUTE_IDS],
    });
}

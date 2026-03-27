import type { Hex } from "viem";

import type { Quote, SubmitOrderResponse } from "../../../internal.js";
import { ProviderExecuteFailure } from "../../../internal.js";

/**
 * Build an SDK {@link SubmitOrderResponse} from a quote's tracking data.
 *
 * @param quote - The SDK quote with tracking information populated during quote adaptation.
 * @returns The submit order response containing the orderId.
 * @throws {ProviderExecuteFailure} When tracking data or orderId is missing from the quote.
 */
export function adaptSubmitResponse(quote: Quote): SubmitOrderResponse {
    const orderId = quote.tracking?.orderId;

    if (!orderId) {
        throw new ProviderExecuteFailure(
            "Missing orderId in quote tracking data. The quote response may not have included a requestId.",
            `quoteId: ${quote.quoteId}`,
        );
    }

    return { orderId: orderId as Hex };
}

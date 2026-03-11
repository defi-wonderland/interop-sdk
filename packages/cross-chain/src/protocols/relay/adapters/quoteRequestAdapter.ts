import type { QuoteRequest } from "../../../internal.js";
import type { RelayQuoteRequest } from "../schemas.js";
import { ProviderGetQuoteFailure } from "../../../internal.js";
import { RelayQuoteRequestSchema } from "../schemas.js";

/**
 * Convert an SDK QuoteRequest to Relay API parameters.
 *
 * @param params - The SDK quote request.
 * @returns The Relay-formatted quote request.
 * @throws {ProviderGetQuoteFailure} When the required amount is missing.
 */
export function adaptQuoteRequest(params: QuoteRequest): RelayQuoteRequest {
    const swapType = params.swapType ?? "exact-input";
    const amount = swapType === "exact-input" ? params.input.amount : params.output.amount;

    if (!amount) {
        const side = swapType === "exact-input" ? "input" : "output";
        throw new ProviderGetQuoteFailure(`${swapType} requires ${side}.amount to be defined`);
    }

    return RelayQuoteRequestSchema.parse({
        user: params.user,
        originChainId: params.input.chainId,
        originCurrency: params.input.assetAddress,
        destinationChainId: params.output.chainId,
        destinationCurrency: params.output.assetAddress,
        amount,
        tradeType: swapType === "exact-input" ? "EXACT_INPUT" : "EXPECTED_OUTPUT",
        recipient: params.output.recipient,
    });
}

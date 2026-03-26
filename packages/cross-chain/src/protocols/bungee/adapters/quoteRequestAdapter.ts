import type { QuoteRequest } from "../../../internal.js";
import type { BungeeQuoteRequest } from "../schemas.js";
import { ProviderGetQuoteFailure } from "../../../internal.js";
import { BungeeQuoteRequestSchema } from "../schemas.js";

/**
 * Convert an SDK QuoteRequest to Bungee API query parameters.
 *
 * @param params - The SDK quote request.
 * @returns The Bungee-formatted quote request.
 * @throws {ProviderGetQuoteFailure} When the required amount is missing.
 */
export function adaptQuoteRequest(params: QuoteRequest): BungeeQuoteRequest {
    const amount = params.input.amount;

    if (!amount) {
        throw new ProviderGetQuoteFailure("Bungee requires input.amount to be defined");
    }

    return BungeeQuoteRequestSchema.parse({
        userAddress: params.user,
        originChainId: String(params.input.chainId),
        destinationChainId: String(params.output.chainId),
        inputToken: params.input.assetAddress,
        inputAmount: amount,
        receiverAddress: params.output.recipient ?? params.user,
        outputToken: params.output.assetAddress,
        enableMultipleAutoRoutes: "true",
    });
}

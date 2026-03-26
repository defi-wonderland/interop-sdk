import type { QuoteRequest } from "../../../internal.js";
import type { BungeeQuoteRequest } from "../schemas.js";
import { ProviderGetQuoteFailure } from "../../../internal.js";
import { BungeeQuoteRequestSchema } from "../schemas.js";

/** Optional provider-level config that affects quote requests. */
export interface BungeeQuoteOptions {
    feeBps?: string;
    feeTakerAddress?: string;
    useInbox?: boolean;
}

/**
 * Convert an SDK QuoteRequest to Bungee API query parameters.
 *
 * @param params - The SDK quote request.
 * @param options - Provider-level config (fees, useInbox).
 * @returns The Bungee-formatted quote request.
 * @throws {ProviderGetQuoteFailure} When the required amount is missing.
 */
export function adaptQuoteRequest(
    params: QuoteRequest,
    options: BungeeQuoteOptions = {},
): BungeeQuoteRequest {
    const amount = params.input.amount;

    if (!amount) {
        throw new ProviderGetQuoteFailure("Bungee requires input.amount to be defined");
    }

    const request: Record<string, string> = {
        userAddress: params.user,
        originChainId: String(params.input.chainId),
        destinationChainId: String(params.output.chainId),
        inputToken: params.input.assetAddress,
        inputAmount: amount,
        receiverAddress: params.output.recipient ?? params.user,
        outputToken: params.output.assetAddress,
        enableMultipleAutoRoutes: "true",
    };

    if (options.feeBps) request.feeBps = options.feeBps;
    if (options.feeTakerAddress) request.feeTakerAddress = options.feeTakerAddress;
    if (options.useInbox) request.useInbox = "true";

    return BungeeQuoteRequestSchema.parse(request);
}

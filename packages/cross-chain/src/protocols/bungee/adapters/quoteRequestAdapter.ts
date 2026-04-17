import type { FeeConfig, SubmissionMode } from "../../../core/schemas/providerConfig.js";
import type { QuoteRequest } from "../../../internal.js";
import type { BungeeQuoteRequest } from "../schemas.js";
import {
    isNativeAddress,
    NATIVE_ASSET_ADDRESS,
    ProviderGetQuoteFailure,
} from "../../../internal.js";
import { BungeeQuoteRequestSchema } from "../schemas.js";

/** Map any native placeholder variant to the one Bungee expects (EIP-7528). */
function toBungeeNativeAddress(address: string): string {
    return isNativeAddress(address, "eip155") ? NATIVE_ASSET_ADDRESS : address;
}

/** Optional provider-level config that affects a single quote request. */
export interface BungeeQuoteOptions extends FeeConfig {
    submissionMode?: SubmissionMode;
    slippage?: string;
    refuel?: boolean;
}

/**
 * Convert an SDK QuoteRequest to Bungee API query parameters.
 *
 * @param params - The SDK quote request.
 * @param options - Provider-level config (fees, submissionMode).
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
        inputToken: toBungeeNativeAddress(params.input.assetAddress),
        inputAmount: amount,
        receiverAddress: params.output.recipient ?? params.user,
        outputToken: toBungeeNativeAddress(params.output.assetAddress),
        enableMultipleAutoRoutes: "true",
    };

    if (options.feeBps) request.feeBps = options.feeBps;
    if (options.feeTakerAddress) request.feeTakerAddress = options.feeTakerAddress;
    if (options.submissionMode === "user-transaction") request.useInbox = "true";
    if (options.slippage) request.slippage = options.slippage;
    if (options.refuel) request.refuel = "true";

    return BungeeQuoteRequestSchema.parse(request);
}

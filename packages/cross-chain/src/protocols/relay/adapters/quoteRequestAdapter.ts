import type { QuoteRequest } from "../../../internal.js";
import type { RelayQuoteRequest } from "../schemas.js";
import { isNativeAddress, ProviderGetQuoteFailure } from "../../../internal.js";
import { RelayQuoteRequestSchema } from "../schemas.js";

/** Native placeholder the Relay API expects for EVM chains. */
const RELAY_NATIVE_PLACEHOLDER = "0x0000000000000000000000000000000000000000";

/** Map any native placeholder variant to the one Relay expects. */
function toRelayNativeAddress(address: string): string {
    return isNativeAddress(address, "eip155") ? RELAY_NATIVE_PLACEHOLDER : address;
}

/** Options forwarded from the provider to the quote request adapter. */
export interface AdaptQuoteOptions {
    /** Submission mode for this specific quote request. */
    submissionMode?: "user-transaction" | "gasless";
}

/**
 * Convert an SDK QuoteRequest to Relay API parameters.
 *
 * @param params - The SDK quote request.
 * @param options - Provider-level options (e.g. submissionModes).
 * @returns The Relay-formatted quote request.
 * @throws {ProviderGetQuoteFailure} When the required amount is missing.
 */
export function adaptQuoteRequest(
    params: QuoteRequest,
    options?: AdaptQuoteOptions,
): RelayQuoteRequest {
    const swapType = params.swapType ?? "exact-input";
    const amount = swapType === "exact-input" ? params.input.amount : params.output.amount;

    if (!amount) {
        const side = swapType === "exact-input" ? "input" : "output";
        throw new ProviderGetQuoteFailure(`${swapType} requires ${side}.amount to be defined`);
    }

    return RelayQuoteRequestSchema.parse({
        user: params.user,
        originChainId: params.input.chainId,
        originCurrency: toRelayNativeAddress(params.input.assetAddress),
        destinationChainId: params.output.chainId,
        destinationCurrency: toRelayNativeAddress(params.output.assetAddress),
        amount,
        tradeType: swapType === "exact-input" ? "EXACT_INPUT" : "EXPECTED_OUTPUT",
        recipient: params.output.recipient,
        usePermit: options?.submissionMode === "gasless",
    });
}

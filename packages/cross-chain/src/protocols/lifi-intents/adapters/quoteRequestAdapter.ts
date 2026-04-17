/**
 * Converts SDK {@link QuoteRequest} to LI.FI Intents integrator quote request format.
 *
 * The integrator endpoint uses a flat format where `chain` is a top-level field
 * on each input/output entry, and `user`/`asset`/`receiver` are plain hex addresses.
 */

import type { QuoteRequest } from "../../../core/schemas/quoteRequest.js";
import type { LifiIntentsQuoteRequest } from "../schemas.js";
import { isNativeAddress } from "../../../core/utils/token.js";

/** Native placeholder the LI.FI Intents API expects for EVM chains. */
const LIFI_INTENTS_NATIVE_PLACEHOLDER = "0x0000000000000000000000000000000000000000";

function toChainString(chainId: number): string {
    return `eip155:${chainId}`;
}

/** Map any native placeholder variant to the one LI.FI Intents expects. */
function toLifiIntentsNativeAddress(address: string): string {
    return isNativeAddress(address, "eip155") ? LIFI_INTENTS_NATIVE_PLACEHOLDER : address;
}

export function adaptQuoteRequest(request: QuoteRequest): LifiIntentsQuoteRequest {
    const { input, output } = request;

    if (request.swapType === "exact-output") {
        throw new Error("LI.FI Intents only supports exact-input swaps.");
    }

    if (!input.amount) {
        throw new Error(
            "LI.FI Intents requires input.amount (exact-input only). Received undefined.",
        );
    }

    const recipientAddress = output.recipient ?? request.user;

    return {
        user: { chain: toChainString(input.chainId), address: request.user },
        intent: {
            intentType: "oif-swap",
            inputs: [
                {
                    chain: toChainString(input.chainId),
                    user: request.user,
                    asset: toLifiIntentsNativeAddress(input.assetAddress),
                    amount: input.amount,
                },
            ],
            outputs: [
                {
                    chain: toChainString(output.chainId),
                    receiver: recipientAddress,
                    asset: toLifiIntentsNativeAddress(output.assetAddress),
                    amount: null,
                },
            ],
            swapType: "exact-input",
        },
        supportedTypes: ["oif-user-open-v0"],
    };
}

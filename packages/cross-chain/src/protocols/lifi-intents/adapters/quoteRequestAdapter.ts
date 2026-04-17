/**
 * Converts SDK {@link QuoteRequest} to LI.FI Intents integrator quote request format.
 *
 * The integrator endpoint uses a flat format where `chain` is a top-level field
 * on each input/output entry, and `user`/`asset`/`receiver` are plain hex addresses.
 */

import type { QuoteRequest } from "../../../core/schemas/quoteRequest.js";
import type { LifiIntentsQuoteRequest } from "../schemas.js";
import { NATIVE_ZERO_ADDRESS, withNativePlaceholder } from "../../../core/utils/token.js";

function toChainString(chainId: number): string {
    return `eip155:${chainId}`;
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
                    asset: withNativePlaceholder(input.assetAddress, "eip155", NATIVE_ZERO_ADDRESS),
                    amount: input.amount,
                },
            ],
            outputs: [
                {
                    chain: toChainString(output.chainId),
                    receiver: recipientAddress,
                    asset: withNativePlaceholder(
                        output.assetAddress,
                        "eip155",
                        NATIVE_ZERO_ADDRESS,
                    ),
                    amount: null,
                },
            ],
            swapType: "exact-input",
        },
        supportedTypes: ["oif-user-open-v0"],
    };
}

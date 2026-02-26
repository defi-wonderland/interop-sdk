/**
 * Converts OIF wire-format quotes (with ERC-7930 addresses and Order union)
 * into SDK {@link Quote} (with InteropAccountId and step-based Order).
 *
 * Composes the order and address adapters.
 */

import type { Order as OifOrder } from "@openintentsframework/oif-specs";

import type { Quote } from "../../../core/types/quote.js";
import type { ProviderQuote } from "../types.js";
import { toInteropAccountId } from "../../../core/utils/interopAccountId.js";
import { adaptOifOrder } from "./orderAdapter.js";

/**
 * Convert a provider quote (OIF wire format) to an SDK {@link Quote}.
 *
 * - Converts the order to a step-based {@link Order}
 * - Converts ERC-7930 addresses in preview to {@link InteropAccountId}
 * - Preserves all other quote fields
 */
export function adaptQuote(providerQuote: ProviderQuote): Quote {
    const order = adaptOifOrder(providerQuote.order as OifOrder);

    const preview = {
        inputs: providerQuote.preview.inputs.map((input) => ({
            account: toInteropAccountId(input.user),
            asset: toInteropAccountId(input.asset),
            amount: input.amount ?? "0",
        })),
        outputs: providerQuote.preview.outputs.map((output) => ({
            account: toInteropAccountId(output.receiver),
            asset: toInteropAccountId(output.asset),
            amount: output.amount ?? "0",
        })),
    };

    return {
        order,
        preview,
        validUntil: providerQuote.validUntil,
        eta: providerQuote.eta,
        provider: providerQuote.provider ?? "",
        quoteId: providerQuote.quoteId,
        failureHandling: providerQuote.failureHandling as string | undefined,
        partialFill: providerQuote.partialFill,
        metadata: providerQuote.metadata as Record<string, unknown> | undefined,
    };
}

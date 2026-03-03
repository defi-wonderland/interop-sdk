/**
 * Converts OIF wire-format quotes (with ERC-7930 addresses and Order union)
 * into SDK {@link Quote} (with InteropAccountId and step-based Order).
 *
 * Composes the order and address adapters.
 */

import type { Order as OifOrder } from "@openintentsframework/oif-specs";

import type { AcrossOrder, ProviderQuote } from "../interfaces/quotes.interface.js";
import type { Order } from "../schemas/order.js";
import type { Quote, QuotePreviewEntry } from "../schemas/quote.js";
import { toInteropAccountId } from "../utils/interopAccountId.js";
import { adaptOifOrder } from "./orderAdapter.js";

// ── Helpers ──────────────────────────────────────────────

function adaptAcrossOrder(order: AcrossOrder): Order {
    return {
        steps: [
            {
                kind: "transaction",
                chainId: order.payload.chainId,
                transaction: {
                    to: order.payload.to,
                    data: order.payload.data,
                    gas: order.payload.gas,
                    ...(order.payload.maxFeePerGas && {
                        maxFeePerGas: order.payload.maxFeePerGas,
                    }),
                    ...(order.payload.maxPriorityFeePerGas && {
                        maxPriorityFeePerGas: order.payload.maxPriorityFeePerGas,
                    }),
                },
            },
        ],
        ...(order.metadata &&
            Object.keys(order.metadata).length > 0 && {
                metadata: order.metadata as Record<string, unknown>,
            }),
    };
}

function adaptPreviewEntry(entry: {
    account: string;
    asset: string;
    amount?: string;
}): QuotePreviewEntry | undefined {
    try {
        const account = toInteropAccountId(entry.account);
        const asset = toInteropAccountId(entry.asset);
        return {
            chainId: account.chainId,
            accountAddress: account.address,
            assetAddress: asset.address,
            amount: entry.amount ?? "0",
        };
    } catch {
        console.warn(`[quoteAdapter] Skipping preview entry with invalid ERC-7930 address`);
        return undefined;
    }
}

// ── Public API ───────────────────────────────────────────

/**
 * Convert a provider quote (OIF wire format) to an SDK {@link Quote}.
 *
 * - Converts the order to a step-based {@link Order}
 * - Converts ERC-7930 addresses in preview to {@link InteropAccountId}
 * - Preserves all other quote fields
 */
export function adaptQuote(providerQuote: ProviderQuote): Quote {
    const order =
        (providerQuote.order as AcrossOrder).type === "across"
            ? adaptAcrossOrder(providerQuote.order as AcrossOrder)
            : adaptOifOrder(providerQuote.order as OifOrder);

    const preview = {
        inputs: providerQuote.preview.inputs
            .map((input) =>
                adaptPreviewEntry({
                    account: input.user,
                    asset: input.asset,
                    amount: input.amount,
                }),
            )
            .filter((e): e is QuotePreviewEntry => e !== undefined),
        outputs: providerQuote.preview.outputs
            .map((output) =>
                adaptPreviewEntry({
                    account: output.receiver,
                    asset: output.asset,
                    amount: output.amount,
                }),
            )
            .filter((e): e is QuotePreviewEntry => e !== undefined),
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

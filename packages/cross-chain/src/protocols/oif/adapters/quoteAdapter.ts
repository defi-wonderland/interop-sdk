/**
 * Converts OIF wire-format quotes (with ERC-7930 addresses and Order union)
 * into SDK {@link Quote} (with InteropAccountId and step-based Order).
 *
 * Composes the order and address adapters.
 */

import type { OifEscrowOrder, Order as OifOrder } from "@openintentsframework/oif-specs";
import type { Address } from "viem";

import type { ProviderQuote } from "../../../core/interfaces/quotes.interface.js";
import type { Order } from "../../../core/schemas/order.js";
import type { Quote, QuotePreviewEntry } from "../../../core/schemas/quote.js";
import type { QuoteRequest } from "../../../core/schemas/quoteRequest.js";
import { toInteropAccountId } from "../../../core/utils/interopAccountId.js";
import { adaptOifOrder } from "./orderAdapter.js";
import { extractPermit2Allowances } from "./permit2AllowanceExtractor.js";

const ESCROW_ORDER_TYPE: OifEscrowOrder["type"] = "oif-escrow-v0";

// ── Public API ───────────────────────────────────────────

/**
 * Convert a provider quote (OIF wire format) to an SDK {@link Quote}.
 *
 * - Converts the order to a step-based {@link Order}
 * - Converts ERC-7930 addresses in preview to {@link InteropAccountId}
 * - Adds Permit2 `checks.allowances` for `oif-escrow-v0` orders
 * - Preserves all other quote fields
 *
 * When `params` is supplied, the EIP-712 envelope is cross-checked against the
 * user-supplied quote request to detect tampering by a compromised solver.
 */
export function adaptQuote(providerQuote: ProviderQuote, params?: QuoteRequest): Quote {
    const order = withPermit2Allowances(
        adaptOifOrder(providerQuote.order as OifOrder, params),
        providerQuote,
    );

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

// ── Helpers ──────────────────────────────────────────────

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

/**
 * Takes the first preview input as the payer. Today intents are single-input,
 * so this matches the schema; it will need a second look if multi-payer
 * intents ever show up.
 */
function extractSigner(providerQuote: ProviderQuote): Address | undefined {
    const firstInput = providerQuote.preview.inputs[0];
    if (!firstInput) return undefined;
    try {
        return toInteropAccountId(firstInput.user).address as Address;
    } catch {
        return undefined;
    }
}

/**
 * Adds Permit2 `checks.allowances` to escrow orders when the payload and
 * preview give us enough to build them. Other order types are returned as-is.
 */
function withPermit2Allowances(order: Order, providerQuote: ProviderQuote): Order {
    const oifOrder = providerQuote.order as OifOrder;
    if (oifOrder.type !== ESCROW_ORDER_TYPE) return order;

    const signer = extractSigner(providerQuote);
    if (!signer) {
        console.warn(
            "[quoteAdapter] Skipping Permit2 allowance extraction: missing signer in preview",
        );
        return order;
    }

    const allowances = extractPermit2Allowances(oifOrder.payload, signer);
    if (allowances.length === 0) return order;

    order.checks = {
        ...order.checks,
        allowances: [...(order.checks?.allowances ?? []), ...allowances],
    };
    return order;
}

/**
 * Converts LI.FI Intents integrator quote response into SDK {@link Quote}.
 *
 * The integrator endpoint returns `oif-user-open-v0` orders in a flat format
 * where `chain` is a top-level field and addresses are plain hex strings.
 * We normalize them into the ERC-7930 shape that {@link adaptOifOrder} expects,
 * then reuse the existing OIF order adapter.
 */

import type { Order as OifOrder } from "@openintentsframework/oif-specs";
import { hexToBytes } from "viem";

import type { Quote } from "../../../core/schemas/quote.js";
import type { LifiIntentsQuoteEntry } from "../schemas.js";
import { adaptOifOrder, fromInteropAccountId } from "../../../internal.js";

function toErc7930(chainString: string, address: string): string {
    const chainId = Number(chainString.split(":")[1]);
    return fromInteropAccountId({ chainId, address });
}

/**
 * Normalize flat-format order fields to the ERC-7930 string format that `adaptOifOrder` expects.
 */
function normalizeOrderForOifAdapter(lifiOrder: LifiIntentsQuoteEntry["order"]): OifOrder {
    if (!lifiOrder || lifiOrder.type !== "oif-user-open-v0") {
        throw new Error("Expected oif-user-open-v0 order from LI.FI integrator endpoint");
    }

    return {
        type: "oif-user-open-v0",
        openIntentTx: {
            to: toErc7930(lifiOrder.openIntentTx.chain, lifiOrder.openIntentTx.to),
            data: hexToBytes(lifiOrder.openIntentTx.data as `0x${string}`),
            gasRequired: lifiOrder.openIntentTx.gasRequired,
        },
        checks: {
            allowances: (lifiOrder.checks?.allowances ?? []).map((a) => ({
                token: toErc7930(a.chain, a.token),
                user: toErc7930(a.chain, a.user),
                spender: toErc7930(a.chain, a.spender),
                required: a.required,
            })),
        },
    } as OifOrder;
}

export function adaptQuoteResponse(entry: LifiIntentsQuoteEntry, providerId: string): Quote {
    const oifOrder = normalizeOrderForOifAdapter(entry.order);
    const sdkOrder = adaptOifOrder(oifOrder);

    const inputEntry = entry.preview.inputs[0];
    const outputEntry = entry.preview.outputs[0];

    if (!inputEntry || !outputEntry) {
        throw new Error("LI.FI quote response missing preview inputs/outputs");
    }

    const inputChainId = Number(inputEntry.chain.split(":")[1]);
    const outputChainId = Number(outputEntry.chain.split(":")[1]);

    return {
        order: sdkOrder,
        preview: {
            inputs: [
                {
                    chainId: inputChainId,
                    accountAddress: inputEntry.user,
                    assetAddress: inputEntry.asset,
                    amount: inputEntry.amount,
                },
            ],
            outputs: [
                {
                    chainId: outputChainId,
                    accountAddress: outputEntry.receiver,
                    assetAddress: outputEntry.asset,
                    amount: outputEntry.amount,
                },
            ],
        },
        quoteId: entry.quoteId,
        validUntil: entry.validUntil,
        provider: providerId,
        failureHandling: entry.failureHandling,
        partialFill: entry.partialFill,
        metadata: {
            exclusiveFor: entry.metadata?.exclusiveFor ?? null,
            lifiProvider: entry.provider,
        },
    };
}

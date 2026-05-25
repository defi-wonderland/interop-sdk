import { decodeFunctionData, erc20Abi } from "viem";

import type { OrderChecks } from "../../../core/schemas/order.js";
import type { Quote, QuotePreviewEntry } from "../../../core/schemas/quote.js";
import type { QuoteRequest, Step } from "../../../internal.js";
import type { RelayQuoteResponse, RelayQuoteStep, RelaySignatureStep } from "../schemas.js";
import { toCanonicalNativeAddress } from "../../../core/utils/token.js";
import { ProviderGetQuoteFailure } from "../../../internal.js";
import { validateRelaySignatureEnvelope } from "../validators/signatureEnvelopeValidator.js";
import { adaptFees } from "./quoteFeeAdapter.js";

/**
 * Extract allowance checks from Relay approve steps.
 *
 * Decodes ERC-20 `approve(spender, amount)` calldata from each incomplete
 * approve-step item and returns SDK-style allowance entries.
 */
function extractAllowances(
    approveSteps: RelayQuoteStep[],
    user: string,
): NonNullable<OrderChecks["allowances"]> {
    const allowances: NonNullable<OrderChecks["allowances"]> = [];

    for (const step of approveSteps) {
        if (step.kind !== "transaction") continue;

        for (const item of step.items) {
            if (item.status !== "incomplete") continue;

            try {
                const { functionName, args } = decodeFunctionData({
                    abi: erc20Abi,
                    data: item.data.data as `0x${string}`,
                });

                if (functionName !== "approve") continue;

                const [spender, amount] = args as [string, bigint];

                allowances.push({
                    chainId: item.data.chainId,
                    tokenAddress: item.data.to,
                    owner: user,
                    spender,
                    required: amount.toString(),
                });
            } catch {
                // If decoding fails, skip this item — it might not be a standard approve call
            }
        }
    }

    return allowances;
}

/**
 * Build an SDK Quote from a Relay API response.
 *
 * @param params - The original SDK quote request.
 * @param response - The Relay API quote response.
 * @param providerId - The provider identifier to stamp on the quote.
 */
export function adaptQuote(
    params: QuoteRequest,
    response: RelayQuoteResponse,
    providerId: string,
): Quote {
    const currencyIn = response.details?.currencyIn;
    const currencyOut = response.details?.currencyOut;

    const approveSteps = response.steps.filter((s) => s.id === "approve");
    const nonApproveSteps = response.steps.filter((s) => s.id !== "approve");

    const relayRequestId = nonApproveSteps.find((s) => s.requestId)?.requestId;
    const allowances = extractAllowances(approveSteps, params.user);
    const fees = adaptFees(response);
    const fallbackToken = extractFallbackToken(params, response);

    return {
        order: {
            steps: nonApproveSteps.flatMap((step) => adaptRelaySteps(step, params)),
            ...(allowances.length > 0 && { checks: { allowances } }),
        },
        preview: {
            inputs: [
                {
                    chainId: currencyIn?.currency.chainId ?? params.input.chainId,
                    accountAddress: params.user,
                    assetAddress: currencyIn?.currency.address ?? params.input.assetAddress,
                    amount: currencyIn?.amount ?? params.input.amount ?? "0",
                    amountUsd: currencyIn?.amountUsd,
                },
            ],
            outputs: [
                {
                    chainId: currencyOut?.currency.chainId ?? params.output.chainId,
                    accountAddress: params.output.recipient ?? params.user,
                    assetAddress: currencyOut?.currency.address ?? params.output.assetAddress,
                    amount: currencyOut?.amount ?? params.output.amount ?? "0",
                    minAmount: currencyOut?.minimumAmount,
                    amountUsd: currencyOut?.amountUsd,
                },
            ],
        },
        quoteId: response.protocol?.v2?.orderId,
        eta: response.details?.timeEstimate,
        partialFill: false,
        failureHandling: "refund-automatic",
        fallbackToken,
        provider: providerId,
        fees,
        tracking: relayRequestId ? { orderId: relayRequestId } : undefined,
        metadata: { relayResponse: response },
    };
}

// Skip when refund equals the input — already conveyed by `failureHandling`.
// @see https://docs.relay.link/references/api/api_core_concepts/refunds
function extractFallbackToken(
    params: QuoteRequest,
    response: RelayQuoteResponse,
): QuotePreviewEntry | undefined {
    const refund = response.details?.refundCurrency;
    if (!refund?.currency) return undefined;

    if (
        refund.currency.chainId === params.input.chainId &&
        toCanonicalNativeAddress(refund.currency.address, "eip155") ===
            toCanonicalNativeAddress(params.input.assetAddress, "eip155")
    ) {
        return undefined;
    }

    return {
        chainId: refund.currency.chainId,
        accountAddress: params.output.recipient ?? params.user,
        assetAddress: toCanonicalNativeAddress(refund.currency.address, "eip155"),
        amount: refund.amount,
    };
}

/** Map a single Relay step to SDK Step entries (one per incomplete item). */
export function adaptRelaySteps(step: RelayQuoteStep, params: QuoteRequest): Step[] {
    if (step.kind === "signature") {
        return adaptSignatureStep(step, params);
    }

    return step.items
        .filter((item) => item.status === "incomplete")
        .map((item) => ({
            kind: "transaction" as const,
            chainId: item.data.chainId,
            description: step.description,
            transaction: {
                to: item.data.to,
                data: item.data.data,
                value: item.data.value,
                ...(item.data.gas &&
                    item.data.gas !== "0" && {
                        gas: item.data.gas,
                    }),
                ...(item.data.maxFeePerGas && {
                    maxFeePerGas: item.data.maxFeePerGas,
                }),
                ...(item.data.maxPriorityFeePerGas && {
                    maxPriorityFeePerGas: item.data.maxPriorityFeePerGas,
                }),
            },
        }));
}

/** Map a Relay signature step to SDK SignatureStep entries (EIP-712 only). */
function adaptSignatureStep(step: RelaySignatureStep, params: QuoteRequest): Step[] {
    return step.items.flatMap((item) => {
        if (item.status !== "incomplete") return [];

        const { sign, post } = item.data;

        if (sign.signatureKind !== "eip712") {
            throw new ProviderGetQuoteFailure(
                `Unsupported signature kind "${sign.signatureKind}". Only EIP-712 signatures are currently supported.`,
            );
        }

        validateRelaySignatureEnvelope(
            {
                domain: sign.domain,
                primaryType: sign.primaryType,
                types: sign.types,
                message: sign.value,
            },
            params,
        );

        return {
            kind: "signature" as const,
            chainId: Number(sign.domain.chainId),
            description: step.description,
            signaturePayload: {
                signatureType: "eip712" as const,
                domain: sign.domain,
                primaryType: sign.primaryType,
                types: sign.types,
                message: sign.value,
            },
            metadata: {
                relayPostData: post,
                relayStepId: step.id,
            },
        };
    });
}

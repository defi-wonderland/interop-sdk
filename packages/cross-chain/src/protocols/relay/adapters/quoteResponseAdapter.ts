import { decodeFunctionData, erc20Abi } from "viem";

import type { OrderChecks } from "../../../core/schemas/order.js";
import type { Quote, QuoteFeeEntry } from "../../../core/schemas/quote.js";
import type { QuoteRequest, Step } from "../../../internal.js";
import type { RelayQuoteResponse, RelayQuoteStep } from "../schemas.js";

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
                const { args } = decodeFunctionData({
                    abi: erc20Abi,
                    data: item.data.data as `0x${string}`,
                });

                // approve(address spender, uint256 amount)
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

/** Map a Relay fee entry (with `currency`) to an SDK QuoteFeeEntry. */
function toFeeEntry(fee: {
    amount: string;
    amountUsd?: string;
    currency: { symbol: string; decimals: number; address: string };
}): QuoteFeeEntry {
    return {
        amount: fee.amount,
        amountUsd: fee.amountUsd,
        token: {
            symbol: fee.currency.symbol,
            decimals: fee.currency.decimals,
            address: fee.currency.address,
        },
    };
}

/** Map Relay fee fields to the SDK-standard QuoteFees shape. */
function adaptFees(response: RelayQuoteResponse): Quote["fees"] {
    const relayerFee = response.fees?.relayer;
    const gasFee = response.fees?.gas;

    if (!relayerFee && !gasFee) return undefined;

    return {
        bridgeFee: relayerFee ? toFeeEntry(relayerFee) : undefined,
        originGas: gasFee ? toFeeEntry(gasFee) : undefined,
    };
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

    const depositStep = nonApproveSteps.find((s) => s.id === "deposit");
    const relayRequestId = depositStep?.requestId;

    const allowances = extractAllowances(approveSteps, params.user);
    const fees = adaptFees(response);

    return {
        order: {
            steps: nonApproveSteps.flatMap((step) => adaptRelaySteps(step)),
            ...(allowances.length > 0 && { checks: { allowances } }),
        },
        preview: {
            inputs: [
                {
                    chainId: currencyIn?.currency.chainId ?? params.input.chainId,
                    accountAddress: params.user,
                    assetAddress: currencyIn?.currency.address ?? params.input.assetAddress,
                    amount: currencyIn?.amount ?? params.input.amount ?? "0",
                },
            ],
            outputs: [
                {
                    chainId: currencyOut?.currency.chainId ?? params.output.chainId,
                    accountAddress: params.output.recipient ?? params.user,
                    assetAddress: currencyOut?.currency.address ?? params.output.assetAddress,
                    amount: currencyOut?.amount ?? params.output.amount ?? "0",
                },
            ],
        },
        quoteId: response.protocol?.v2?.orderId,
        eta: response.details?.timeEstimate,
        partialFill: false,
        failureHandling: "refund-automatic",
        provider: providerId,
        fees,
        tracking: relayRequestId ? { orderId: relayRequestId } : undefined,
        metadata: { relayResponse: response },
    };
}

/** Map a single Relay step to SDK Step entries (one per incomplete transaction item). */
export function adaptRelaySteps(step: RelayQuoteStep): Step[] {
    if (step.kind !== "transaction") {
        return [];
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

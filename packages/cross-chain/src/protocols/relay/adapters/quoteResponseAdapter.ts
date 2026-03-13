import type { Quote, QuoteRequest, Step } from "../../../internal.js";
import type { RelayQuoteResponse, RelayQuoteStep } from "../schemas.js";

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

    const depositStep = response.steps.find((s) => s.id === "deposit");
    const relayRequestId = depositStep?.requestId;

    return {
        order: {
            steps: response.steps.flatMap((step) => adaptRelaySteps(step)),
            ...(relayRequestId && {
                metadata: { relayRequestId },
            }),
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

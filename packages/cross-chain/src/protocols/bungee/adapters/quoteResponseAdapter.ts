import type { OrderChecks } from "../../../core/schemas/order.js";
import type { QuoteRequest } from "../../../core/schemas/quoteRequest.js";
import type { Quote, Step } from "../../../internal.js";
import type {
    BungeeApprovalData,
    BungeeAutoRoute,
    BungeeBuildTxResult,
    BungeeManualRoute,
    BungeeQuoteResponse,
    BungeeQuoteResult,
    BungeeTxData,
} from "../schemas.js";
import { BungeeTxDataSchema } from "../schemas.js";
import { validateBungeeSignatureEnvelope } from "../validators/signatureEnvelopeValidator.js";
import { adaptFees } from "./quoteFeeAdapter.js";

/**
 * Build SDK Quotes from a Bungee API quote response.
 *
 * Collects routes from `autoRoute` and `autoRoutes[]`,
 * adapts each into an SDK Quote. The recommended route (`autoRoute`) is first.
 *
 * @param response - The Bungee API quote response.
 * @param providerId - The provider identifier to stamp on the quotes.
 * @param params - The original SDK quote request, used to validate signature envelopes.
 */
export function adaptQuotes(
    response: BungeeQuoteResponse,
    providerId: string,
    params: QuoteRequest,
): Quote[] {
    const result = response.result;

    const autoRoutes = collectAutoRoutes(result);
    return autoRoutes
        .map((autoRoute) => adaptAutoRouteQuote(response, autoRoute, providerId, params))
        .filter((quote) => quote.order.steps.length > 0);
}

/**
 * Adapt a Bungee manual route plus its built transaction into an SDK Quote.
 *
 * Manual routes come without an executable txData —
 * the caller has to fetch `/api/v1/bungee/build-tx?quoteId=…` and combine that
 * with the route preview/fees. Tracking is intentionally left undefined: manual
 * routes have no `requestHash`, so the SDK tracks them by the on-chain `txHash`
 * once the transaction is sent, reusing Bungee's `/status` endpoint.
 *
 * @param response - The original Bungee quote response (for input/preview data).
 * @param manualRoute - The manual route entry from `result.manualRoutes`.
 * @param buildTx - The build-tx result for this route's `quoteId`.
 * @param providerId - The provider identifier to stamp on the quote.
 * @returns An SDK Quote with a TransactionStep, or `null` if the txData is invalid.
 */
export function adaptManualRouteQuote(
    response: BungeeQuoteResponse,
    manualRoute: BungeeManualRoute,
    buildTx: BungeeBuildTxResult,
    providerId: string,
): Quote | null {
    const result = response.result;
    const bridgeName = manualRoute.routeDetails?.name ?? "bridge";
    const step = buildTransactionStep(buildTx.txData, `Submit transaction via ${bridgeName}`);
    if (!step) return null;

    const allowances: NonNullable<OrderChecks["allowances"]> = extractAllowances(
        buildTx.approvalData ?? manualRoute.approvalData,
        result.originChainId,
        result.input.amount,
    );

    const fees = adaptFees(manualRoute);

    return {
        order: {
            steps: [step],
            ...(allowances.length > 0 && { checks: { allowances } }),
        },
        preview: {
            inputs: [
                {
                    chainId: result.input.token.chainId,
                    accountAddress: result.userAddress,
                    assetAddress: result.input.token.address,
                    amount: result.input.amount,
                    amountUsd: String(result.input.valueInUsd),
                },
            ],
            outputs: [
                {
                    chainId: manualRoute.output.token.chainId,
                    accountAddress: result.receiverAddress,
                    assetAddress: manualRoute.output.token.address,
                    amount: manualRoute.output.amount,
                    amountUsd: String(manualRoute.output.valueInUsd),
                },
            ],
        },
        quoteId: manualRoute.quoteId,
        eta: manualRoute.estimatedTime,
        partialFill: false,
        failureHandling: "refund-automatic",
        provider: providerId,
        fees,
        metadata: {
            bungeeResponse: response,
            bungeeManualRoute: manualRoute,
            bungeeBuildTx: buildTx,
        },
    };
}

/** Collect all auto routes from the response, deduplicating singular + array forms. */
function collectAutoRoutes(result: BungeeQuoteResult): BungeeAutoRoute[] {
    const routes: BungeeAutoRoute[] = [];
    const seen = new Set<string>();

    if (result.autoRoute) {
        routes.push(result.autoRoute);
        seen.add(result.autoRoute.quoteId);
    }

    for (const route of result.autoRoutes ?? []) {
        if (!seen.has(route.quoteId)) {
            routes.push(route);
            seen.add(route.quoteId);
        }
    }

    return routes;
}

/** Adapt a single auto route into an SDK Quote. */
function adaptAutoRouteQuote(
    response: BungeeQuoteResponse,
    autoRoute: BungeeAutoRoute,
    providerId: string,
    params: QuoteRequest,
): Quote {
    const result = response.result;
    const steps = buildAutoRouteSteps(autoRoute, result.originChainId, params);
    const fees = adaptFees(autoRoute);
    const allowances = extractAllowances(
        autoRoute.approvalData,
        result.originChainId,
        result.input.amount,
    );

    return {
        order: {
            steps,
            ...(allowances.length > 0 && { checks: { allowances } }),
        },
        preview: {
            inputs: [
                {
                    chainId: result.input.token.chainId,
                    accountAddress: result.userAddress,
                    assetAddress: result.input.token.address,
                    amount: result.input.amount,
                    amountUsd: String(result.input.valueInUsd),
                },
            ],
            outputs: [
                {
                    chainId: autoRoute.output.token.chainId,
                    accountAddress: result.receiverAddress,
                    assetAddress: autoRoute.output.token.address,
                    // Use effectiveAmount (post-fee expected) over amount (pre-fee optimistic) so
                    // the headline doesn't oversell. minAmountOut is the slippage floor.
                    amount: autoRoute.output.effectiveAmount ?? autoRoute.output.amount,
                    minAmount: autoRoute.output.minAmountOut,
                    amountUsd: String(
                        autoRoute.output.effectiveValueInUsd ?? autoRoute.output.valueInUsd,
                    ),
                },
            ],
        },
        quoteId: autoRoute.quoteId,
        eta: autoRoute.estimatedTime,
        partialFill: false,
        failureHandling: "refund-automatic",
        provider: providerId,
        fees,
        tracking: autoRoute.requestHash ? { orderId: autoRoute.requestHash } : undefined,
        metadata: { bungeeResponse: response, bungeeAutoRoute: autoRoute },
    };
}

// ── Step builders ──────────────────────────────────────

/** Build SDK steps from a Bungee auto route. */
function buildAutoRouteSteps(
    autoRoute: BungeeAutoRoute,
    originChainId: number,
    params: QuoteRequest,
): Step[] {
    if (autoRoute.userOp === "sign" && autoRoute.signTypedData) {
        return [buildSignatureStep(autoRoute, originChainId, params)];
    }

    if (autoRoute.userOp === "tx" && autoRoute.txData) {
        const step = buildTransactionStep(autoRoute.txData, "Submit transaction to Bungee");
        return step ? [step] : [];
    }

    return [];
}

/** Build a SignatureStep from Bungee permit2 flow. */
function buildSignatureStep(
    autoRoute: BungeeAutoRoute,
    originChainId: number,
    params: QuoteRequest,
): Step {
    const signTypedData = autoRoute.signTypedData!;
    const types = signTypedData.types as Record<string, Array<{ name: string; type: string }>>;
    const primaryType = "PermitWitnessTransferFrom";

    validateBungeeSignatureEnvelope(
        {
            domain: signTypedData.domain,
            primaryType,
            types,
            message: signTypedData.values,
        },
        params,
    );

    return {
        kind: "signature" as const,
        chainId: originChainId,
        description: "Sign permit2 approval for Bungee",
        signaturePayload: {
            signatureType: "eip712" as const,
            domain: signTypedData.domain,
            primaryType,
            types,
            message: signTypedData.values,
        },
    };
}

/** Build a TransactionStep from Bungee tx data. Returns `null` if txData is not valid. */
function buildTransactionStep(txData: BungeeTxData, description: string): Step | null {
    const parsed = BungeeTxDataSchema.safeParse(txData);
    if (!parsed.success) return null;

    const { to, data, value, chainId } = parsed.data;
    if (!to || typeof data !== "string") return null;

    return {
        kind: "transaction" as const,
        chainId,
        description,
        transaction: {
            to,
            data,
            value,
        },
    };
}

// ── Allowance helpers ──────────────────────────────────

/**
 * Extract allowance checks from Bungee approval data.
 *
 * Uses `inputAmount` instead of `approvalData.amount` — Bungee returns a post-fee
 * approval amount that causes TRANSFER_FROM_FAILED errors on-chain.
 */
function extractAllowances(
    approvalData: BungeeApprovalData | null | undefined,
    originChainId: number,
    inputAmount: string,
): NonNullable<OrderChecks["allowances"]> {
    if (!approvalData) return [];

    const { spenderAddress, tokenAddress, userAddress } = approvalData;
    return [
        {
            chainId: originChainId,
            tokenAddress,
            owner: userAddress,
            spender: spenderAddress,
            required: inputAmount,
        },
    ];
}

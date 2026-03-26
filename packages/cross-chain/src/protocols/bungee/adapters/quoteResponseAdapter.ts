import type { Quote, Step } from "../../../internal.js";
import type {
    BungeeApprovalData,
    BungeeAutoRoute,
    BungeeQuoteResponse,
    BungeeQuoteResult,
} from "../schemas.js";
import { adaptFees } from "./quoteFeeAdapter.js";

/**
 * Build SDK Quotes from a Bungee API quote response.
 *
 * Collects routes from `autoRoute` and `autoRoutes[]`,
 * adapts each into an SDK Quote. The recommended route (`autoRoute`) is first.
 *
 * @param response - The Bungee API quote response.
 * @param providerId - The provider identifier to stamp on the quotes.
 */
export function adaptQuotes(response: BungeeQuoteResponse, providerId: string): Quote[] {
    const result = response.result;

    const autoRoutes = collectAutoRoutes(result);
    const quotes = autoRoutes.map((autoRoute) =>
        adaptAutoRouteQuote(response, autoRoute, providerId),
    );

    return sortByOutputAmount(quotes);
}

/** Sort quotes by output amount descending (best output first). */
function sortByOutputAmount(quotes: Quote[]): Quote[] {
    return quotes.sort((a, b) => {
        const amountA = BigInt(a.preview.outputs[0]?.amount ?? "0");
        const amountB = BigInt(b.preview.outputs[0]?.amount ?? "0");
        if (amountA > amountB) return -1;
        if (amountA < amountB) return 1;
        return 0;
    });
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
): Quote {
    const result = response.result;
    const steps = buildAutoRouteSteps(autoRoute, result.originChainId);
    const fees = adaptFees(autoRoute);
    const allowances = buildAllowancesFromApprovalData(
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
                },
            ],
            outputs: [
                {
                    chainId: autoRoute.output.token.chainId,
                    accountAddress: result.receiverAddress,
                    assetAddress: autoRoute.output.token.address,
                    amount: autoRoute.output.amount,
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
function buildAutoRouteSteps(autoRoute: BungeeAutoRoute, originChainId: number): Step[] {
    if (autoRoute.userOp === "sign" && autoRoute.signTypedData) {
        return [buildSignatureStep(autoRoute, originChainId)];
    }

    if (autoRoute.userOp === "tx" && autoRoute.txData) {
        return [buildTransactionStep(autoRoute)];
    }

    return [];
}

/** Build a SignatureStep from Bungee permit2 flow. */
function buildSignatureStep(autoRoute: BungeeAutoRoute, originChainId: number): Step {
    const signTypedData = autoRoute.signTypedData!;

    return {
        kind: "signature" as const,
        chainId: originChainId,
        description: "Sign permit2 approval for Bungee",
        signaturePayload: {
            signatureType: "eip712" as const,
            domain: signTypedData.domain,
            primaryType: "PermitWitnessTransferFrom",
            types: signTypedData.types as Record<string, Array<{ name: string; type: string }>>,
            message: signTypedData.values,
        },
    };
}

/** Build a TransactionStep from Bungee onchain flow. */
function buildTransactionStep(autoRoute: BungeeAutoRoute): Step {
    const txData = autoRoute.txData!;

    return {
        kind: "transaction" as const,
        chainId: txData.chainId,
        description: "Submit transaction to Bungee",
        transaction: {
            to: txData.to ?? "",
            data: typeof txData.data === "string" ? txData.data : "",
            value: txData.value,
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
function buildAllowancesFromApprovalData(
    approvalData: BungeeApprovalData | null | undefined,
    originChainId: number,
    inputAmount: string,
): Array<{
    chainId: number;
    tokenAddress: string;
    owner: string;
    spender: string;
    required: string;
}> {
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

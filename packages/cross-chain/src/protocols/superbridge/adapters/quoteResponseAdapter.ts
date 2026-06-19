import type { SignatureStep, Step, TransactionStep } from "../../../core/schemas/order.js";
import type { SubmissionMode } from "../../../core/schemas/providerConfig.js";
import type { Quote, QuoteFeeEntry, QuoteFees } from "../../../core/schemas/quote.js";
import type { QuoteRequest } from "../../../core/schemas/quoteRequest.js";
import type { Eip712Domain, Eip712Envelope } from "../../../core/types/eip712.js";
import type {
    SuperbridgeEvmGaslessTransaction,
    SuperbridgeFeeGroup,
    SuperbridgeFeeItem,
    SuperbridgeRouteMeta,
    SuperbridgeRouteQuote,
    SuperbridgeRoutesResponse,
    SuperbridgeRouteStep,
    SuperbridgeTokenApproval,
} from "../schemas.js";
import { ProviderGetQuoteFailure } from "../../../internal.js";
import { SuperbridgeRouteQuoteSchema, SuperbridgeTypedDataSchema } from "../schemas.js";
import { validateSuperbridgeSignatureEnvelope } from "../validators/index.js";

const MODE_BY_TX_TYPE = {
    evm: "user-transaction",
    "evm-gasless": "gasless",
} as const;

/**
 * Build SDK Quotes from a Superbridge `/v1/routes` response.
 *
 * Keeps only successful quotes (those with an `initiatingTransaction`) whose
 * initiating transaction type matches an enabled submission mode.
 *
 * @throws {ProviderGetQuoteFailure} When every route requires a submission mode that is not enabled.
 */
export function adaptQuoteResponse(
    response: SuperbridgeRoutesResponse,
    providerId: string,
    params: QuoteRequest,
    modes: ReadonlySet<SubmissionMode>,
): Quote[] {
    const quotes: Quote[] = [];
    const unavailableModes = new Set<SubmissionMode>();
    for (const result of response.results) {
        const parsed = SuperbridgeRouteQuoteSchema.safeParse(result.result);
        if (!parsed.success) continue;
        const mode = MODE_BY_TX_TYPE[parsed.data.initiatingTransaction.type];
        if (!modes.has(mode)) {
            unavailableModes.add(mode);
            continue;
        }
        const quote = adaptRouteQuote(parsed.data, result.meta, providerId, params);
        if (quote) quotes.push(quote);
    }

    if (quotes.length === 0 && unavailableModes.size > 0) {
        throw new ProviderGetQuoteFailure(
            `No Superbridge routes match the enabled submission modes. Available routes require: ${[...unavailableModes].join(", ")}`,
        );
    }

    return quotes;
}

function adaptRouteQuote(
    route: SuperbridgeRouteQuote,
    meta: SuperbridgeRouteMeta | undefined,
    providerId: string,
    params: QuoteRequest,
): Quote | null {
    const routeId = meta?.id;
    const mainStep = buildMainStep(route, routeId, params);
    if (!mainStep) return null;

    return {
        order: { steps: [...buildApprovalSteps(route), mainStep] },
        preview: buildPreview(route, params),
        eta: route.duration ?? sumWaitSeconds(route.steps),
        partialFill: false,
        provider: providerId,
        fees: adaptFees(route.fees),
        metadata: {
            superbridgeProvider: meta?.provider?.name,
            superbridgeRouteId: routeId,
        },
    };
}

/** Total wait time across a quote's wait steps, in seconds (used as the ETA). */
function sumWaitSeconds(steps: SuperbridgeRouteStep[] | undefined): number | undefined {
    if (!steps) return undefined;
    const totalMs = steps.reduce(
        (acc, step) => acc + (step.type === "wait" ? (step.expectedDuration ?? 0) : 0),
        0,
    );
    return totalMs > 0 ? Math.round(totalMs / 1000) : undefined;
}

function buildMainStep(
    route: SuperbridgeRouteQuote,
    routeId: string | undefined,
    params: QuoteRequest,
): Step | null {
    const tx = route.initiatingTransaction;
    if (tx.type === "evm") {
        return {
            kind: "transaction",
            chainId: Number(tx.chainId),
            description: "Submit transaction to Superbridge",
            transaction: { to: tx.to, data: tx.data, value: tx.value },
        };
    }
    return buildSignatureStep(tx, routeId, params);
}

function buildSignatureStep(
    tx: SuperbridgeEvmGaslessTransaction,
    routeId: string | undefined,
    params: QuoteRequest,
): SignatureStep | null {
    const parsed = SuperbridgeTypedDataSchema.safeParse(safeJsonParse(tx.typedData));
    if (!parsed.success) return null;
    if (!routeId) return null;

    const envelope: Eip712Envelope = {
        domain: parsed.data.domain as Eip712Domain,
        primaryType: parsed.data.primaryType,
        types: parsed.data.types,
        message: parsed.data.message,
    };
    validateSuperbridgeSignatureEnvelope(envelope, params);

    return {
        kind: "signature",
        chainId: params.input.chainId,
        description: "Sign gasless authorization for Superbridge",
        signaturePayload: {
            signatureType: "eip712",
            domain: parsed.data.domain,
            primaryType: parsed.data.primaryType,
            types: parsed.data.types,
            message: parsed.data.message,
        },
        metadata: {
            superbridgeTypedData: tx.typedData,
            superbridgeChainId: String(params.input.chainId),
            superbridgeRouteId: routeId,
        },
    };
}

function buildApprovalSteps(route: SuperbridgeRouteQuote): TransactionStep[] {
    const steps: TransactionStep[] = [];
    if (route.revokeTokenApproval) {
        steps.push(toApprovalStep(route.revokeTokenApproval, "Revoke existing token allowance"));
    }
    if (route.tokenApproval) {
        steps.push(toApprovalStep(route.tokenApproval, "Approve token for Superbridge"));
    }
    if (route.gasTokenApproval) {
        steps.push(toApprovalStep(route.gasTokenApproval, "Approve gas token for Superbridge"));
    }
    return steps;
}

function toApprovalStep(approval: SuperbridgeTokenApproval, description: string): TransactionStep {
    return {
        kind: "transaction",
        category: "approval",
        chainId: Number(approval.tx.chainId),
        description,
        transaction: {
            to: approval.tx.to,
            data: approval.tx.data,
            value: approval.tx.value,
        },
    };
}

function buildPreview(route: SuperbridgeRouteQuote, params: QuoteRequest): Quote["preview"] {
    return {
        inputs: [
            {
                chainId: params.input.chainId,
                accountAddress: params.user,
                assetAddress: route.token?.address ?? params.input.assetAddress,
                amount: params.input.amount ?? "0",
            },
        ],
        outputs: [
            {
                chainId: params.output.chainId,
                accountAddress: params.output.recipient ?? params.user,
                assetAddress: route.receiveToken?.address ?? params.output.assetAddress,
                amount: route.receive ?? params.output.amount ?? "0",
            },
        ],
    };
}

function safeJsonParse(value: string): unknown {
    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
}

/** Map Superbridge fee groups to the SDK-standard QuoteFees shape. */
function adaptFees(feeGroups: SuperbridgeFeeGroup[] | undefined): QuoteFees | undefined {
    const items = (feeGroups ?? []).flatMap((group) => group.items);
    if (items.length === 0) return undefined;

    const gasItem = items.find(isGasFee);
    const bridgeItem = items.find((item) => !isGasFee(item));

    const fees: QuoteFees = {};
    if (gasItem) fees.originGas = toFeeEntry(gasItem);
    if (bridgeItem) fees.bridgeFee = toFeeEntry(bridgeItem);

    if (!fees.originGas && !fees.bridgeFee) return undefined;
    return fees;
}

function isGasFee(item: SuperbridgeFeeItem): boolean {
    return (item.name ?? "").toLowerCase().includes("gas");
}

function toFeeEntry(item: SuperbridgeFeeItem): QuoteFeeEntry {
    return {
        amount: item.amount,
        token: item.token
            ? {
                  symbol: item.token.symbol,
                  decimals: item.token.decimals,
                  address: item.token.address,
              }
            : undefined,
    };
}

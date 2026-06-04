/**
 * Converts OIF wire-format orders into SDK {@link Order} with steps[].
 *
 * This is the outbound boundary: protocol order types → user-friendly SDK order.
 */

import type {
    Oif3009Order,
    OifEscrowOrder,
    Order as OifOrder,
    OifResourceLockOrder,
} from "@openintentsframework/oif-specs";
import { bytesToHex } from "viem";

import type {
    UnverifiedOrderField,
    UnverifiedOrderType,
} from "../../../core/errors/UnverifiedOrderEntries.exception.js";
import type {
    Order,
    OrderChecks,
    SignatureStep,
    TransactionStep,
} from "../../../core/schemas/order.js";
import type { QuoteRequest } from "../../../core/schemas/quoteRequest.js";
import { UnverifiedOrderEntries } from "../../../core/errors/UnverifiedOrderEntries.exception.js";
import { toInteropAccountId } from "../../../core/utils/interopAccountId.js";
import {
    validateOif3009SignatureEnvelope,
    validateOifEscrowSignatureEnvelope,
} from "../validators/signatureEnvelopeValidator.js";

// ── Helpers ──────────────────────────────────────────────

function toSignatureStep(
    payload: {
        signatureType: "eip712";
        domain: object;
        primaryType: string;
        message: object;
        types: Record<string, Array<{ name: string; type: string }>>;
    },
    metadata?: Record<string, unknown>,
): SignatureStep {
    const domain = payload.domain as Record<string, unknown>;
    const chainId = Number(domain.chainId) || 0;

    return {
        kind: "signature",
        chainId,
        signaturePayload: {
            signatureType: payload.signatureType,
            domain,
            primaryType: payload.primaryType,
            types: payload.types,
            message: payload.message as Record<string, unknown>,
        },
        ...(metadata && { metadata }),
    };
}

function assertSingleEntry(
    entries: readonly unknown[] | undefined,
    orderType: UnverifiedOrderType,
    field: UnverifiedOrderField,
): void {
    const count = entries?.length ?? 0;
    if (count > 1) {
        throw new UnverifiedOrderEntries(orderType, field, count);
    }
}

// ── OIF Order Converters ─────────────────────────────────

function fromOifEscrowOrder(order: OifEscrowOrder, params: QuoteRequest): Order {
    assertSingleEntry(
        (order.payload.message as { permitted?: unknown[] }).permitted,
        "oif-escrow-v0",
        "permitted",
    );

    validateOifEscrowSignatureEnvelope(order, params);
    return {
        steps: [toSignatureStep(order.payload)],
        lock: { type: "oif-escrow" },
    };
}

function fromOif3009Order(order: Oif3009Order, params: QuoteRequest): Order {
    validateOif3009SignatureEnvelope(order, params);
    return {
        steps: [toSignatureStep(order.payload, order.metadata as Record<string, unknown>)],
        lock: { type: "oif-escrow" },
    };
}

function fromOifResourceLockOrder(order: OifResourceLockOrder): Order {
    assertSingleEntry(
        (order.payload.message as { commitments?: unknown[] }).commitments,
        "oif-resource-lock-v0",
        "commitments",
    );

    return {
        steps: [toSignatureStep(order.payload)],
        lock: { type: "compact-resource-lock" },
    };
}

function fromOifUserOpenOrder(order: {
    type: "oif-user-open-v0";
    openIntentTx: { to: string; data: Uint8Array; gasRequired: string };
    checks: {
        allowances: Array<{
            token: string;
            user: string;
            spender: string;
            required: string;
        }>;
    };
}): Order {
    assertSingleEntry(order.checks?.allowances, "oif-user-open-v0", "allowances");

    const txData =
        order.openIntentTx.data instanceof Uint8Array
            ? bytesToHex(order.openIntentTx.data)
            : (order.openIntentTx.data as string);

    // openIntentTx.to is ERC-7930 per the OIF spec — extract address and chainId
    let toAddress: string;
    let chainId = 0;
    try {
        const decoded = toInteropAccountId(order.openIntentTx.to);
        toAddress = decoded.address;
        chainId = decoded.chainId;
    } catch {
        toAddress = order.openIntentTx.to;
    }

    const step: TransactionStep = {
        kind: "transaction",
        chainId,
        transaction: {
            to: toAddress,
            data: txData,
            gas: order.openIntentTx.gasRequired,
        },
    };

    let checks: OrderChecks | undefined;
    if (order.checks?.allowances?.length) {
        const validAllowances = order.checks.allowances
            .map((a) => {
                try {
                    const token = toInteropAccountId(a.token);
                    const user = toInteropAccountId(a.user);
                    const spender = toInteropAccountId(a.spender);
                    return {
                        chainId: token.chainId,
                        tokenAddress: token.address,
                        owner: user.address,
                        spender: spender.address,
                        required: a.required,
                    };
                } catch {
                    console.warn(`[orderAdapter] Skipping allowance with invalid ERC-7930 address`);
                    return undefined;
                }
            })
            .filter((a): a is NonNullable<typeof a> => a !== undefined);

        if (validAllowances.length > 0) {
            checks = { allowances: validAllowances };
        }
    }

    return {
        steps: [step],
        checks,
    };
}

// ── Public API ───────────────────────────────────────────

/**
 * Convert an OIF wire-format order to an SDK {@link Order}. For `oif-escrow-v0`
 * and `oif-3009-v0` (gasless signature orders), `params` is required so the
 * EIP-712 envelope can be cross-checked against the user's quote request; the
 * other order types (`oif-resource-lock-v0`, `oif-user-open-v0`) don't reach
 * the signature validators and accept calls without it.
 */
export function adaptOifOrder(order: OifOrder, params?: QuoteRequest): Order {
    switch (order.type) {
        case "oif-escrow-v0":
            return fromOifEscrowOrder(order, requireParams(order.type, params));
        case "oif-3009-v0":
            return fromOif3009Order(order, requireParams(order.type, params));
        case "oif-resource-lock-v0":
            return fromOifResourceLockOrder(order);
        case "oif-user-open-v0":
            return fromOifUserOpenOrder(order);
        default:
            throw new Error(`Unknown OIF order type: ${(order as { type: string }).type}`);
    }
}

function requireParams(orderType: string, params: QuoteRequest | undefined): QuoteRequest {
    if (params === undefined) {
        throw new Error(
            `QuoteRequest required to adapt ${orderType}: EIP-712 envelope cannot be validated without it`,
        );
    }
    return params;
}

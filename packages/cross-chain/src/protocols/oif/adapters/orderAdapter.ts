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
    Order,
    OrderChecks,
    SignatureStep,
    TransactionStep,
} from "../../../core/types/order.js";
import { toInteropAccountId } from "../../../core/utils/interopAccountId.js";

// ── Helpers ──────────────────────────────────────────────

function extractChainIdFromDomain(domain: Record<string, unknown>): number {
    const chainId = domain.chainId;
    if (typeof chainId === "number") return chainId;
    if (typeof chainId === "string") return Number(chainId);
    if (typeof chainId === "bigint") return Number(chainId);
    return 0;
}

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
    return {
        kind: "signature",
        chainId: extractChainIdFromDomain(domain),
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

// ── OIF Order Converters ─────────────────────────────────

function fromOifEscrowOrder(order: OifEscrowOrder): Order {
    return {
        steps: [toSignatureStep(order.payload)],
        lock: { type: "oif-escrow" },
    };
}

function fromOif3009Order(order: Oif3009Order): Order {
    return {
        steps: [toSignatureStep(order.payload, order.metadata as Record<string, unknown>)],
        lock: { type: "oif-escrow" },
    };
}

function fromOifResourceLockOrder(order: OifResourceLockOrder): Order {
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
        checks = {
            allowances: order.checks.allowances.map((a) => {
                // checks.allowances[].token is ERC-7930 per the OIF spec
                const token = toInteropAccountId(a.token);
                return {
                    token,
                    owner: a.user,
                    spender: a.spender,
                    required: a.required,
                };
            }),
        };
    }

    return {
        steps: [step],
        checks,
    };
}

// ── Public API ───────────────────────────────────────────

/**
 * Convert an OIF wire-format order to an SDK {@link Order}.
 */
export function adaptOifOrder(order: OifOrder): Order {
    switch (order.type) {
        case "oif-escrow-v0":
            return fromOifEscrowOrder(order);
        case "oif-3009-v0":
            return fromOif3009Order(order);
        case "oif-resource-lock-v0":
            return fromOifResourceLockOrder(order);
        case "oif-user-open-v0":
            return fromOifUserOpenOrder(order);
        default:
            throw new Error(`Unknown OIF order type: ${(order as { type: string }).type}`);
    }
}

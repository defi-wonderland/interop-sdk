import type { Address } from "viem";
import { getAddress, isAddress } from "viem";

import type { SignatureStep } from "../schemas/order.js";
import type { QuoteRequest } from "../schemas/quoteRequest.js";
import {
    CANONICAL_PERMIT2_ADDRESS,
    PERMIT2_BATCH_PRIMARY_TYPES,
    PERMIT2_PRIMARY_TYPES,
} from "../constants/permit2.js";
import { Permit2ValidationFailure } from "../errors/Permit2ValidationFailure.exception.js";

/** Inputs required to decide whether a Permit2 signature is safe to surface. */
export interface Permit2ValidationContext {
    providerId: string;
    request: QuoteRequest;
    expectedSpenders?: readonly Address[];
}

interface TokenPermission {
    token: string;
    amount: string;
}

/**
 * Guards Permit2 EIP-712 payloads against solver tampering (audit V12 #6).
 *
 * The contract is fail-closed: any deviation from the user's intent or the
 * canonical Permit2 anchor raises {@link Permit2ValidationFailure}.
 */
export class Permit2SignatureValidator {
    public validate(step: SignatureStep, context: Permit2ValidationContext): void {
        const { signaturePayload } = step;
        const { primaryType, domain, message } = signaturePayload;
        const looksLikePermit2 = PERMIT2_PRIMARY_TYPES.has(primaryType);

        const verifyingContract = readAddress(domain["verifyingContract"]);
        const canonicalMatch = verifyingContract === CANONICAL_PERMIT2_ADDRESS;

        if (looksLikePermit2 && !canonicalMatch) {
            throw new Permit2ValidationFailure(
                "verifying-contract",
                context.providerId,
                `Permit2 primaryType "${primaryType}" but verifyingContract is not the canonical Permit2 address`,
                `got=${String(domain["verifyingContract"])} expected=${CANONICAL_PERMIT2_ADDRESS}`,
            );
        }

        if (!looksLikePermit2 && canonicalMatch) {
            throw new Permit2ValidationFailure(
                "non-permit2-canonical",
                context.providerId,
                `verifyingContract is canonical Permit2 but primaryType "${primaryType}" is not a Permit2 type`,
            );
        }

        if (!looksLikePermit2) return;

        const permitted = normalizePermitted(primaryType, message["permitted"]);
        this.assertPermittedMatchesRequest(permitted, context);

        if (context.expectedSpenders && context.expectedSpenders.length > 0) {
            this.assertSpenderAllowed(message["spender"], context);
        }
    }

    private assertPermittedMatchesRequest(
        permitted: readonly TokenPermission[],
        context: Permit2ValidationContext,
    ): void {
        const requestedToken = getAddress(context.request.input.assetAddress);
        const requestedAmount = BigInt(context.request.input.amount ?? "0");

        let total = 0n;
        for (const entry of permitted) {
            if (!isAddress(entry.token)) {
                throw new Permit2ValidationFailure(
                    "permitted-token",
                    context.providerId,
                    `permitted token "${entry.token}" is not a valid address`,
                );
            }
            if (getAddress(entry.token) !== requestedToken) {
                throw new Permit2ValidationFailure(
                    "permitted-token",
                    context.providerId,
                    `permitted token ${entry.token} does not match the requested input token ${requestedToken}`,
                );
            }
            total += BigInt(entry.amount);
        }

        if (requestedAmount > 0n && total > requestedAmount) {
            throw new Permit2ValidationFailure(
                "permitted-amount",
                context.providerId,
                `permitted total ${total} exceeds requested input amount ${requestedAmount}`,
            );
        }
    }

    private assertSpenderAllowed(rawSpender: unknown, context: Permit2ValidationContext): void {
        const spender = readAddress(rawSpender);
        if (!spender) {
            throw new Permit2ValidationFailure(
                "spender",
                context.providerId,
                `permit message.spender "${String(rawSpender)}" is not a valid address`,
            );
        }

        const allowed = context.expectedSpenders!.map((s) => getAddress(s));
        if (!allowed.includes(spender)) {
            throw new Permit2ValidationFailure(
                "spender",
                context.providerId,
                `permit message.spender ${spender} is not in the expected list`,
                `expected one of [${allowed.join(", ")}]`,
            );
        }
    }
}

export const permit2SignatureValidator = new Permit2SignatureValidator();

function readAddress(value: unknown): Address | null {
    if (typeof value !== "string" || !isAddress(value)) return null;
    return getAddress(value);
}

function normalizePermitted(primaryType: string, raw: unknown): readonly TokenPermission[] {
    if (PERMIT2_BATCH_PRIMARY_TYPES.has(primaryType)) {
        if (!Array.isArray(raw)) return [];
        return raw as TokenPermission[];
    }
    if (raw && typeof raw === "object" && "token" in (raw as object)) {
        return [raw as TokenPermission];
    }
    return [];
}

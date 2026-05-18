import type { Address } from "viem";
import { getAddress, isAddressEqual } from "viem";

import type { SignatureStep } from "../schemas/order.js";
import type { QuoteRequest } from "../schemas/quoteRequest.js";
import type { Permit2TokenPermission } from "../utils/permit2.js";
import { CANONICAL_PERMIT2_ADDRESS, PERMIT2_PRIMARY_TYPES } from "../constants/permit2.js";
import { Permit2ValidationFailure } from "../errors/Permit2ValidationFailure.exception.js";
import { readPermittedEntries, toAddressOrNull } from "../utils/permit2.js";

/** Inputs required to decide whether a Permit2 signature is safe to surface. */
export interface Permit2ValidationContext {
    providerId: string;
    request: QuoteRequest;
    expectedSpenders?: readonly Address[];
}

/**
 * Guards Permit2 EIP-712 payloads against solver tampering (audit V12 #6).
 * Fail-closed: any deviation from the canonical anchor or the user's intent
 * raises {@link Permit2ValidationFailure}.
 */
export class Permit2SignatureValidator {
    public validate(step: SignatureStep, context: Permit2ValidationContext): void {
        const { primaryType, domain, message } = step.signaturePayload;
        const isPermit2Type = PERMIT2_PRIMARY_TYPES.has(primaryType);

        this.assertVerifyingContract(
            domain["verifyingContract"],
            primaryType,
            isPermit2Type,
            context,
        );
        if (!isPermit2Type) return;

        const permitted = readPermittedEntries(primaryType, message["permitted"]);
        this.assertPermittedMatchesRequest(permitted, context);
        this.assertSpenderInExpectedList(message["spender"], context);
    }

    private assertVerifyingContract(
        raw: unknown,
        primaryType: string,
        isPermit2Type: boolean,
        context: Permit2ValidationContext,
    ): void {
        const verifyingContract = toAddressOrNull(raw);
        const isCanonical =
            verifyingContract !== null &&
            isAddressEqual(verifyingContract, CANONICAL_PERMIT2_ADDRESS);

        if (isPermit2Type && !isCanonical) {
            throw new Permit2ValidationFailure(
                "verifying-contract",
                context.providerId,
                `Permit2 primaryType "${primaryType}" with non-canonical verifyingContract`,
                `got=${String(raw)} expected=${CANONICAL_PERMIT2_ADDRESS}`,
            );
        }
        if (!isPermit2Type && isCanonical) {
            throw new Permit2ValidationFailure(
                "non-permit2-canonical",
                context.providerId,
                `Non-Permit2 primaryType "${primaryType}" signed against canonical Permit2`,
            );
        }
    }

    private assertPermittedMatchesRequest(
        permitted: readonly Permit2TokenPermission[],
        context: Permit2ValidationContext,
    ): void {
        const requestedToken = getAddress(context.request.input.assetAddress);
        const requestedAmount = BigInt(context.request.input.amount ?? "0");

        let total = 0n;
        for (const entry of permitted) {
            const token = toAddressOrNull(entry.token);
            if (!token || !isAddressEqual(token, requestedToken)) {
                throw new Permit2ValidationFailure(
                    "permitted-token",
                    context.providerId,
                    `permitted token ${entry.token} does not match the requested input ${requestedToken}`,
                );
            }
            total += BigInt(entry.amount);
        }

        if (requestedAmount > 0n && total > requestedAmount) {
            throw new Permit2ValidationFailure(
                "permitted-amount",
                context.providerId,
                `permitted total ${total} exceeds requested input ${requestedAmount}`,
            );
        }
    }

    private assertSpenderInExpectedList(raw: unknown, context: Permit2ValidationContext): void {
        const { expectedSpenders, providerId } = context;
        if (!expectedSpenders?.length) return;

        const spender = toAddressOrNull(raw);
        if (!spender) {
            throw new Permit2ValidationFailure(
                "spender",
                providerId,
                `permit message.spender "${String(raw)}" is not a valid address`,
            );
        }
        if (!expectedSpenders.some((s) => isAddressEqual(spender, s))) {
            throw new Permit2ValidationFailure(
                "spender",
                providerId,
                `permit message.spender ${spender} is not in the expected list`,
                `expected one of [${expectedSpenders.join(", ")}]`,
            );
        }
    }
}

export const permit2SignatureValidator = new Permit2SignatureValidator();

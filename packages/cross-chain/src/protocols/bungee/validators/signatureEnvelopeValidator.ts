import type { Address } from "viem";
import { getAddress, isAddressEqual } from "viem";

import type { Eip712MismatchField } from "../../../core/errors/Eip712EnvelopeMismatch.exception.js";
import type { QuoteRequest } from "../../../core/schemas/quoteRequest.js";
import type { Eip712Envelope } from "../../../core/types/eip712.js";
import { PERMIT2_ADDRESS } from "../../../core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../core/errors/Eip712EnvelopeMismatch.exception.js";
import { readAddressField } from "../../../core/utils/eip712Readers.js";
import { isNativeAddress, toCanonicalNativeAddress } from "../../../core/utils/token.js";
import { toNonNegativeBigInt } from "../../../core/utils/toNonNegativeBigInt.js";
import {
    validateEnvelopeDomain,
    validatePrimaryType,
} from "../../../core/validators/eip712EnvelopeValidator.js";
import { validatePermit2Message } from "../../../core/validators/permit2MessageValidator.js";

const PROVIDER_NAME = "bungee";

const BUNGEE_PRIMARY_TYPES: ReadonlySet<string> = new Set(["PermitWitnessTransferFrom"]);

/**
 * Validate a Bungee-issued EIP-712 envelope against the user-supplied quote request.
 *
 * Bungee uses Permit2 with an extended `witness.basicReq` payload that mirrors
 * the requested route — sender, receiver, chain ids, tokens, amounts and
 * bungeeGateway. We cross-check every one of those against the quote request,
 * so a tampered envelope cannot redirect funds, switch chains or output token,
 * or inflate the input amount without being rejected with `Eip712EnvelopeMismatch`.
 */
export function validateBungeeSignatureEnvelope(
    envelope: Eip712Envelope,
    params: QuoteRequest,
): void {
    validatePrimaryType(envelope, BUNGEE_PRIMARY_TYPES, PROVIDER_NAME);
    guardAgainstNativeInputAsset(envelope, params);
    validateEnvelopeDomain(envelope, {
        chainId: params.input.chainId,
        verifyingContracts: [PERMIT2_ADDRESS],
        provider: PROVIDER_NAME,
    });

    const user = getAddress(params.user);
    const spender = readRecipientField(envelope, ["spender"], "spender", user);
    const maxAmount = params.input.amount !== undefined ? BigInt(params.input.amount) : undefined;

    validatePermit2Message(envelope, {
        provider: PROVIDER_NAME,
        spender,
        inputToken: getAddress(params.input.assetAddress),
        maxAmount,
    });

    validateBungeeWitness(envelope, params, user, spender, maxAmount);
}

function readRecipientField(
    envelope: Eip712Envelope,
    path: ReadonlyArray<string>,
    field: Eip712MismatchField,
    user: Address,
): Address {
    const recipient = readAddressField({ envelope, path, field, provider: PROVIDER_NAME });
    if (isAddressEqual(recipient, user)) {
        throw new Eip712EnvelopeMismatch({
            field,
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            received: recipient,
            cause: `${field} must not be the user`,
        });
    }
    return recipient;
}

function validateBungeeWitness(
    envelope: Eip712Envelope,
    params: QuoteRequest,
    user: Address,
    spender: Address,
    maxAmount: bigint | undefined,
): void {
    const basicReq = readBasicReq(envelope);

    readAddressField({
        envelope,
        path: ["witness", "basicReq", "sender"],
        field: "user",
        provider: PROVIDER_NAME,
        expected: user,
    });

    const expectedReceiver = params.output.recipient ? getAddress(params.output.recipient) : user;
    readAddressField({
        envelope,
        path: ["witness", "basicReq", "receiver"],
        field: "recipient",
        provider: PROVIDER_NAME,
        expected: expectedReceiver,
    });

    assertUintEquals({
        envelope,
        value: basicReq.originChainId,
        expected: BigInt(params.input.chainId),
        field: "chainId",
        cause: "witness.basicReq.originChainId",
    });

    assertUintEquals({
        envelope,
        value: basicReq.destinationChainId,
        expected: BigInt(params.output.chainId),
        field: "chainId",
        cause: "witness.basicReq.destinationChainId",
    });

    readAddressField({
        envelope,
        path: ["witness", "basicReq", "inputToken"],
        field: "token",
        provider: PROVIDER_NAME,
        expected: getAddress(params.input.assetAddress),
    });

    assertOutputTokenEquals(envelope, basicReq.outputToken, params.output.assetAddress);

    if (maxAmount !== undefined) {
        assertInputAmountWithinLimit(envelope, basicReq.inputAmount, maxAmount);
    }

    readAddressField({
        envelope,
        path: ["witness", "basicReq", "bungeeGateway"],
        field: "spender",
        provider: PROVIDER_NAME,
        expected: spender,
    });
}

function readBasicReq(envelope: Eip712Envelope): Record<string, unknown> {
    const witness = envelope.message.witness;
    if (typeof witness !== "object" || witness === null || Array.isArray(witness)) {
        throw new Eip712EnvelopeMismatch({
            field: "structure",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            cause: "witness object missing",
        });
    }
    const basicReq = (witness as Record<string, unknown>).basicReq;
    if (typeof basicReq !== "object" || basicReq === null || Array.isArray(basicReq)) {
        throw new Eip712EnvelopeMismatch({
            field: "structure",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            cause: "witness.basicReq missing",
        });
    }
    return basicReq as Record<string, unknown>;
}

interface AssertUintEqualsArgs {
    envelope: Eip712Envelope;
    value: unknown;
    expected: bigint;
    field: Eip712MismatchField;
    cause: string;
}

function assertUintEquals(args: AssertUintEqualsArgs): void {
    const { envelope, value, expected, field, cause } = args;
    const parsed = toNonNegativeBigInt(value);
    if (parsed === undefined) {
        throw new Eip712EnvelopeMismatch({
            field,
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            expected,
            received: String(value),
            cause,
        });
    }
    if (parsed !== expected) {
        throw new Eip712EnvelopeMismatch({
            field,
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            expected,
            received: parsed,
            cause,
        });
    }
}

function assertOutputTokenEquals(
    envelope: Eip712Envelope,
    rawOutputToken: unknown,
    expectedAssetAddress: string,
): void {
    const expected = toCanonicalNativeAddress(expectedAssetAddress, "eip155");
    if (typeof rawOutputToken !== "string") {
        throw new Eip712EnvelopeMismatch({
            field: "token",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            expected,
            received: String(rawOutputToken),
            cause: "witness.basicReq.outputToken",
        });
    }
    const received = toCanonicalNativeAddress(rawOutputToken, "eip155");
    if (received !== expected) {
        throw new Eip712EnvelopeMismatch({
            field: "token",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            expected,
            received,
            cause: "witness.basicReq.outputToken",
        });
    }
}

function assertInputAmountWithinLimit(
    envelope: Eip712Envelope,
    rawAmount: unknown,
    maxAmount: bigint,
): void {
    const parsed = toNonNegativeBigInt(rawAmount);
    if (parsed === undefined) {
        throw new Eip712EnvelopeMismatch({
            field: "amount",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            received: String(rawAmount),
            cause: "witness.basicReq.inputAmount",
        });
    }
    if (parsed > maxAmount) {
        throw new Eip712EnvelopeMismatch({
            field: "amount",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            expected: maxAmount,
            received: parsed,
            cause: "witness.basicReq.inputAmount",
        });
    }
}

function guardAgainstNativeInputAsset(envelope: Eip712Envelope, params: QuoteRequest): void {
    if (!isNativeAddress(params.input.assetAddress, "eip155")) return;
    throw new Eip712EnvelopeMismatch({
        field: "structure",
        provider: PROVIDER_NAME,
        primaryType: envelope.primaryType,
        cause: "Permit2 envelope rejected: input asset is the native placeholder",
    });
}

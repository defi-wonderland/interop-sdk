import type { Address } from "viem";
import { getAddress, isAddressEqual } from "viem";

import type { QuoteRequest } from "../../../core/schemas/quoteRequest.js";
import type { Eip712Envelope } from "../../../core/types/eip712.js";
import {
    EIP3009_PRIMARY_TYPES,
    PERMIT2_ADDRESS,
    PERMIT2_BATCH_PRIMARY_TYPES,
    PERMIT2_SINGLE_PRIMARY_TYPES,
} from "../../../core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../core/errors/Eip712EnvelopeMismatch.exception.js";
import { readAddressField } from "../../../core/utils/eip712Readers.js";
import { isNativeAddress } from "../../../core/utils/token.js";
import {
    validateEnvelopeDomain,
    validatePrimaryType,
} from "../../../core/validators/eip712EnvelopeValidator.js";
import { validateEip3009Message } from "../../../core/validators/eip3009MessageValidator.js";
import { validatePermit2Message } from "../../../core/validators/permit2MessageValidator.js";

const PROVIDER_NAME = "superbridge";

type Mechanism = "Permit2" | "EIP-3009";
type RecipientField = "spender" | "to";

const SUPERBRIDGE_PERMIT2_PRIMARY_TYPES: ReadonlySet<string> = new Set<string>([
    ...PERMIT2_SINGLE_PRIMARY_TYPES,
    ...PERMIT2_BATCH_PRIMARY_TYPES,
]);

const SUPERBRIDGE_PRIMARY_TYPES: ReadonlySet<string> = new Set<string>([
    ...SUPERBRIDGE_PERMIT2_PRIMARY_TYPES,
    ...EIP3009_PRIMARY_TYPES,
]);

/**
 * Validate a Superbridge gasless EIP-712 envelope against the user-supplied quote request.
 *
 * Dispatches by `primaryType` to the Permit2 or EIP-3009 path and cross-checks chain,
 * verifying contract, token, amount cap, recipient and deadline against the user intent.
 * Any other `primaryType` is rejected so the user never signs an envelope the SDK cannot verify.
 */
export function validateSuperbridgeSignatureEnvelope(
    envelope: Eip712Envelope,
    params: QuoteRequest,
): void {
    validatePrimaryType(envelope, SUPERBRIDGE_PRIMARY_TYPES, PROVIDER_NAME);

    const maxAmount = params.input.amount !== undefined ? BigInt(params.input.amount) : undefined;
    const user = getAddress(params.user);

    if (EIP3009_PRIMARY_TYPES.has(envelope.primaryType)) {
        validateEip3009Envelope(envelope, params, user, maxAmount);
        return;
    }

    validatePermit2Envelope(envelope, params, user, maxAmount);
}

function validatePermit2Envelope(
    envelope: Eip712Envelope,
    params: QuoteRequest,
    user: Address,
    maxAmount: bigint | undefined,
): void {
    guardAgainstNativeAsset(envelope, params, "Permit2");
    guardPermit2DomainHasNoVersion(envelope);
    validateEnvelopeDomain(envelope, {
        chainId: params.input.chainId,
        verifyingContracts: [PERMIT2_ADDRESS],
        provider: PROVIDER_NAME,
    });
    const spender = readRecipientField(envelope, "spender", user);
    validatePermit2Message(envelope, {
        provider: PROVIDER_NAME,
        spender,
        inputToken: getAddress(params.input.assetAddress),
        maxAmount,
    });
}

function validateEip3009Envelope(
    envelope: Eip712Envelope,
    params: QuoteRequest,
    user: Address,
    maxAmount: bigint | undefined,
): void {
    guardAgainstNativeAsset(envelope, params, "EIP-3009");
    validateEnvelopeDomain(envelope, {
        chainId: params.input.chainId,
        verifyingContracts: [getAddress(params.input.assetAddress)],
        provider: PROVIDER_NAME,
    });
    guardEip3009DomainVersion(envelope);
    const to = readRecipientField(envelope, "to", user);
    validateEip3009Message(envelope, {
        provider: PROVIDER_NAME,
        user,
        to,
        maxValue: maxAmount,
    });
}

function readRecipientField(
    envelope: Eip712Envelope,
    field: RecipientField,
    user: Address,
): Address {
    const recipient = readAddressField({
        envelope,
        path: [field],
        field,
        provider: PROVIDER_NAME,
    });
    if (isAddressEqual(recipient, user)) {
        throw new Eip712EnvelopeMismatch({
            field,
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            received: recipient,
            cause: "recipient must not be the user",
        });
    }
    return recipient;
}

function guardAgainstNativeAsset(
    envelope: Eip712Envelope,
    params: QuoteRequest,
    mechanism: Mechanism,
): void {
    if (!isNativeAddress(params.input.assetAddress, "eip155")) return;
    throw new Eip712EnvelopeMismatch({
        field: "structure",
        provider: PROVIDER_NAME,
        primaryType: envelope.primaryType,
        cause: `${mechanism} envelope rejected: input asset is the native placeholder`,
    });
}

function guardEip3009DomainVersion(envelope: Eip712Envelope): void {
    const version = envelope.domain.version;
    if (typeof version === "string" && version.length > 0) return;
    throw new Eip712EnvelopeMismatch({
        field: "domainVersion",
        provider: PROVIDER_NAME,
        primaryType: envelope.primaryType,
        received: String(version),
    });
}

function guardPermit2DomainHasNoVersion(envelope: Eip712Envelope): void {
    if (envelope.domain.version === undefined) return;
    throw new Eip712EnvelopeMismatch({
        field: "domainVersion",
        provider: PROVIDER_NAME,
        primaryType: envelope.primaryType,
        expected: "absent",
        received: String(envelope.domain.version),
    });
}

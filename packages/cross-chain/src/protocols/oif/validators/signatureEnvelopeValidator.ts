import type { Oif3009Order, OifEscrowOrder } from "@openintentsframework/oif-specs";
import type { Address, TypedDataParameter } from "viem";
import { getAddress, hexToBigInt, isAddressEqual, isHex, size, slice } from "viem";

import type { QuoteRequest } from "../../../core/schemas/quoteRequest.js";
import type { Eip712Domain, Eip712Envelope } from "../../../core/types/eip712.js";
import { EIP3009_PRIMARY_TYPES, PERMIT2_ADDRESS } from "../../../core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../core/errors/Eip712EnvelopeMismatch.exception.js";
import { readAddressField } from "../../../core/utils/eip712Readers.js";
import { isNativeAddress } from "../../../core/utils/token.js";
import {
    validateEnvelopeDomain,
    validatePrimaryType,
} from "../../../core/validators/eip712EnvelopeValidator.js";
import { validateEip3009Message } from "../../../core/validators/eip3009MessageValidator.js";
import { validatePermit2Message } from "../../../core/validators/permit2MessageValidator.js";
import { OIF_INPUT_SETTLER_ESCROW_BY_CHAIN } from "../constants.js";

const PROVIDER_NAME = "oif";
const ESCROW_PRIMARY_TYPES: ReadonlySet<string> = new Set(["PermitBatchWitnessTransferFrom"]);
const DECIMAL_CHAIN_ID = /^\d+$/;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

type Mechanism = "Permit2" | "EIP-3009";
type RecipientField = "spender" | "to";

/** Validate an OIF escrow envelope: Permit2 family on the canonical Permit2 contract. */
export function validateOifEscrowSignatureEnvelope(
    order: OifEscrowOrder,
    params: QuoteRequest,
): void {
    const envelope = toEnvelope(order.payload);

    validatePrimaryType(envelope, ESCROW_PRIMARY_TYPES, PROVIDER_NAME);
    guardPermit2DomainHasNoVersion(envelope);
    validateEnvelopeDomain(envelope, {
        chainId: params.input.chainId,
        verifyingContracts: [PERMIT2_ADDRESS],
        provider: PROVIDER_NAME,
    });
    guardAgainstNativeAsset(envelope, params, "Permit2");

    const user = getAddress(params.user);
    const spender = readRecipientField(envelope, "spender", user);
    validatePermit2Message(envelope, {
        provider: PROVIDER_NAME,
        spender,
        inputToken: getAddress(params.input.assetAddress),
        maxAmount: params.input.amount !== undefined ? BigInt(params.input.amount) : undefined,
    });
    validateEscrowWitness(envelope, params, user);
}

/**
 * Validate an OIF EIP-3009 envelope. The `verifyingContract` of the typed-data
 * domain is the token contract itself (that's how EIP-3009 works), so we
 * cross-check the domain against the user's input asset directly — no extra
 * metadata fields required.
 */
export function validateOif3009SignatureEnvelope(order: Oif3009Order, params: QuoteRequest): void {
    const envelope = toEnvelope(order.payload);

    validatePrimaryType(envelope, EIP3009_PRIMARY_TYPES, PROVIDER_NAME);
    guardEip3009DomainVersion(envelope);
    guardAgainstNativeAsset(envelope, params, "EIP-3009");
    validateEnvelopeDomain(envelope, {
        chainId: params.input.chainId,
        verifyingContracts: [getAddress(params.input.assetAddress)],
        provider: PROVIDER_NAME,
    });

    const user = getAddress(params.user);
    const to = readExpectedInputSettler(envelope, params, user);
    validateEip3009Message(envelope, {
        provider: PROVIDER_NAME,
        user,
        to,
        maxValue: params.input.amount !== undefined ? BigInt(params.input.amount) : undefined,
    });
}

function readExpectedInputSettler(
    envelope: Eip712Envelope,
    params: QuoteRequest,
    user: Address,
): Address {
    const expectedSettler = OIF_INPUT_SETTLER_ESCROW_BY_CHAIN[params.input.chainId];
    if (expectedSettler === undefined) {
        throw new Eip712EnvelopeMismatch({
            field: "to",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            cause: `OIF has no input settler on chain ${params.input.chainId}`,
        });
    }

    const to = readRecipientField(envelope, "to", user);
    if (!isAddressEqual(to, expectedSettler)) {
        throw new Eip712EnvelopeMismatch({
            field: "to",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            expected: expectedSettler,
            received: to,
        });
    }
    return to;
}

function toEnvelope(payload: OifEscrowOrder["payload"] | Oif3009Order["payload"]): Eip712Envelope {
    return {
        domain: payload.domain as Eip712Domain,
        primaryType: payload.primaryType,
        types: payload.types as Record<string, readonly TypedDataParameter[]>,
        message: payload.message as Record<string, unknown>,
    };
}

/**
 * Read `spender` (Permit2) or `to` (EIP-3009) from the envelope message. We
 * only assert it isn't the user — pinning the settler to a specific address
 * would need a trusted-contract registry the SDK doesn't maintain.
 */
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

function validateEscrowWitness(
    envelope: Eip712Envelope,
    params: QuoteRequest,
    user: Address,
): void {
    const witness = envelope.message.witness;
    if (witness === null || typeof witness !== "object") {
        throw new Eip712EnvelopeMismatch({
            field: "structure",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            cause: "missing witness in PermitBatchWitnessTransferFrom message",
        });
    }

    readAddressField({
        envelope,
        path: ["witness", "user"],
        field: "user",
        provider: PROVIDER_NAME,
        expected: user,
    });

    const outputs = (witness as { outputs?: unknown }).outputs;
    if (!Array.isArray(outputs) || outputs.length !== 1) {
        throw new Eip712EnvelopeMismatch({
            field: "structure",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            cause: `witness.outputs must contain exactly one entry, got ${
                Array.isArray(outputs) ? outputs.length : typeof outputs
            }`,
        });
    }

    const expectedRecipientAddress = getAddress(params.output.recipient ?? params.user);

    const output = outputs[0];
    if (output === null || typeof output !== "object" || Array.isArray(output)) {
        throw new Eip712EnvelopeMismatch({
            field: "structure",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            cause: "witness.outputs[0] must be an object",
        });
    }

    const outputRecord = output as Record<string, unknown>;

    const outputChainId = parseChainId(outputRecord.chainId);
    if (outputChainId !== params.output.chainId) {
        throw new Eip712EnvelopeMismatch({
            field: "chainId",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            expected: params.output.chainId,
            received: outputChainId !== undefined ? outputChainId : String(outputRecord.chainId),
        });
    }

    const expectedToken = getAddress(params.output.assetAddress);
    const witnessToken = decodeBytes32Address(outputRecord.token, envelope.primaryType, "token");
    if (!isAddressEqual(witnessToken, expectedToken)) {
        throw new Eip712EnvelopeMismatch({
            field: "token",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            expected: expectedToken,
            received: witnessToken,
        });
    }

    const witnessRecipient = decodeBytes32Address(
        outputRecord.recipient,
        envelope.primaryType,
        "recipient",
    );
    if (!isAddressEqual(witnessRecipient, expectedRecipientAddress)) {
        throw new Eip712EnvelopeMismatch({
            field: "recipient",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            expected: expectedRecipientAddress,
            received: witnessRecipient,
        });
    }

    if (params.output.amount !== undefined) {
        const minAmount = BigInt(params.output.amount);
        const witnessAmount = toBigIntOrUndefined(outputRecord.amount);
        if (witnessAmount === undefined) {
            throw new Eip712EnvelopeMismatch({
                field: "amount",
                provider: PROVIDER_NAME,
                primaryType: envelope.primaryType,
                received: String(outputRecord.amount),
            });
        }
        // `params.output.amount` is the floor the user is willing to receive.
        // A malicious solver could sign `outputs[0].amount = 0`, pull the input
        // via Permit2 and fill a near-zero output — reject under-delivery.
        if (witnessAmount < minAmount) {
            throw new Eip712EnvelopeMismatch({
                field: "amount",
                provider: PROVIDER_NAME,
                primaryType: envelope.primaryType,
                expected: minAmount,
                received: witnessAmount,
            });
        }
    }
}

function decodeBytes32Address(
    raw: unknown,
    primaryType: string,
    field: "token" | "recipient",
): Address {
    if (typeof raw !== "string" || !isHex(raw) || size(raw) !== 32) {
        throw new Eip712EnvelopeMismatch({
            field,
            provider: PROVIDER_NAME,
            primaryType,
            received: String(raw),
            cause: `witness.outputs[0].${field} must be a 32-byte hex string`,
        });
    }
    if (BigInt(slice(raw, 0, 12)) !== 0n) {
        throw new Eip712EnvelopeMismatch({
            field,
            provider: PROVIDER_NAME,
            primaryType,
            received: raw,
            cause: `witness.outputs[0].${field} has non-zero high bytes — not an EVM address`,
        });
    }
    return getAddress(slice(raw, 12));
}

function toBigIntOrUndefined(value: unknown): bigint | undefined {
    if (typeof value === "bigint") return value >= 0n ? value : undefined;
    if (typeof value === "number") {
        return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : undefined;
    }
    if (typeof value !== "string" || value.length === 0) return undefined;
    try {
        const parsed = isHex(value) ? hexToBigInt(value) : BigInt(value);
        return parsed >= 0n ? parsed : undefined;
    } catch {
        return undefined;
    }
}

function parseChainId(value: unknown): number | undefined {
    if (typeof value === "number") {
        return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
    }
    if (typeof value === "bigint") {
        return value >= 0n && value <= MAX_SAFE_BIGINT ? Number(value) : undefined;
    }
    if (typeof value !== "string" || value.length === 0) return undefined;
    let parsed: bigint;
    if (isHex(value)) {
        if (value.length <= 2) return undefined;
        parsed = hexToBigInt(value);
    } else if (DECIMAL_CHAIN_ID.test(value)) {
        parsed = BigInt(value);
    } else {
        return undefined;
    }
    return parsed <= MAX_SAFE_BIGINT ? Number(parsed) : undefined;
}

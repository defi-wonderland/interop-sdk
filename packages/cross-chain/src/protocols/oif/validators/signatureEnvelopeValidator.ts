import type { Oif3009Order, OifEscrowOrder } from "@openintentsframework/oif-specs";
import type { Address, TypedDataParameter } from "viem";
import { getAddress, hexToBigInt, isAddressEqual, isHex } from "viem";

import type { QuoteRequest } from "../../../core/schemas/quoteRequest.js";
import type { Eip712Domain, Eip712Envelope } from "../../../core/types/eip712.js";
import { EIP3009_PRIMARY_TYPES, PERMIT2_ADDRESS } from "../../../core/constants/eip712.js";
import { Eip712EnvelopeMismatch } from "../../../core/errors/Eip712EnvelopeMismatch.exception.js";
import { readAddressField } from "../../../core/utils/eip712Readers.js";
import { assertNotExpired } from "../../../core/utils/expiry.js";
import { isNativeAddress } from "../../../core/utils/token.js";
import {
    validateEnvelopeDomain,
    validatePrimaryType,
} from "../../../core/validators/eip712EnvelopeValidator.js";
import { validateEip3009Message } from "../../../core/validators/eip3009MessageValidator.js";
import { validatePermit2Message } from "../../../core/validators/permit2MessageValidator.js";

const PROVIDER_NAME = "oif";
const ESCROW_PRIMARY_TYPES: ReadonlySet<string> = new Set(["PermitBatchWitnessTransferFrom"]);
const DECIMAL_CHAIN_ID = /^\d+$/;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

type Mechanism = "Permit2" | "EIP-3009";
type RecipientField = "spender" | "to";

interface Eip3009Metadata {
    chainId?: number | string;
    tokenAddress?: string;
}

/** Validate an OIF escrow envelope: Permit2 family on the canonical Permit2 contract. */
export function validateOifEscrowSignatureEnvelope(
    order: OifEscrowOrder,
    params?: QuoteRequest,
): void {
    const envelope = toEnvelope(order.payload);

    validatePrimaryType(envelope, ESCROW_PRIMARY_TYPES, PROVIDER_NAME);
    guardPermit2DomainHasNoVersion(envelope);

    const expectedChainId = params?.input.chainId ?? readDomainChainId(envelope);
    validateEnvelopeDomain(envelope, {
        chainId: expectedChainId,
        verifyingContracts: [PERMIT2_ADDRESS],
        provider: PROVIDER_NAME,
    });

    if (params === undefined) {
        assertNotExpired({
            timestamp: envelope.message.deadline,
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
        });
        return;
    }

    guardAgainstNativeAsset(envelope, params, "Permit2");
    const user = getAddress(params.user);
    const spender = readRecipientField(envelope, "spender", user);
    validatePermit2Message(envelope, {
        provider: PROVIDER_NAME,
        spender,
        inputToken: getAddress(params.input.assetAddress),
        maxAmount: params.input.amount !== undefined ? BigInt(params.input.amount) : undefined,
    });
}

/** Validate an OIF EIP-3009 envelope: verifyingContract must be the token from metadata. */
export function validateOif3009SignatureEnvelope(order: Oif3009Order, params?: QuoteRequest): void {
    const envelope = toEnvelope(order.payload);
    const metadata = order.metadata as Eip3009Metadata;

    if (typeof metadata?.tokenAddress !== "string" || metadata.tokenAddress.length === 0) {
        throw new Eip712EnvelopeMismatch({
            field: "structure",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            cause: "missing metadata.tokenAddress for oif-3009-v0",
        });
    }
    const metadataChainId = parseChainId(metadata.chainId);
    if (metadataChainId === undefined) {
        throw new Eip712EnvelopeMismatch({
            field: "structure",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            cause: "missing metadata.chainId for oif-3009-v0",
        });
    }

    const metadataToken = getAddress(metadata.tokenAddress);

    if (params !== undefined) {
        if (metadataChainId !== params.input.chainId) {
            throw new Eip712EnvelopeMismatch({
                field: "chainId",
                provider: PROVIDER_NAME,
                primaryType: envelope.primaryType,
                expected: params.input.chainId,
                received: metadataChainId,
            });
        }
        guardAgainstNativeAsset(envelope, params, "EIP-3009");
        const expectedToken = getAddress(params.input.assetAddress);
        if (!isAddressEqual(metadataToken, expectedToken)) {
            throw new Eip712EnvelopeMismatch({
                field: "token",
                provider: PROVIDER_NAME,
                primaryType: envelope.primaryType,
                expected: expectedToken,
                received: metadataToken,
            });
        }
    }

    validatePrimaryType(envelope, EIP3009_PRIMARY_TYPES, PROVIDER_NAME);
    validateEnvelopeDomain(envelope, {
        chainId: params?.input.chainId ?? metadataChainId,
        verifyingContracts: [metadataToken],
        provider: PROVIDER_NAME,
    });
    guardEip3009DomainVersion(envelope);

    if (params === undefined) return;

    const user = getAddress(params.user);
    const to = readRecipientField(envelope, "to", user);
    validateEip3009Message(envelope, {
        provider: PROVIDER_NAME,
        user,
        to,
        maxValue: params.input.amount !== undefined ? BigInt(params.input.amount) : undefined,
    });
}

function toEnvelope(payload: OifEscrowOrder["payload"] | Oif3009Order["payload"]): Eip712Envelope {
    return {
        domain: payload.domain as Eip712Domain,
        primaryType: payload.primaryType,
        types: payload.types as Record<string, readonly TypedDataParameter[]>,
        message: payload.message as Record<string, unknown>,
    };
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

function readDomainChainId(envelope: Eip712Envelope): number {
    const parsed = parseChainId(envelope.domain.chainId);
    if (parsed === undefined) {
        throw new Eip712EnvelopeMismatch({
            field: "chainId",
            provider: PROVIDER_NAME,
            primaryType: envelope.primaryType,
            received: String(envelope.domain.chainId),
        });
    }
    return parsed;
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

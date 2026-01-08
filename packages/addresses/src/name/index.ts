import type { InteropAddress } from "../internal.js";
import type { ParsedInteropNameComponents } from "./parseInteropNameString.js";
import type { ResolvedAddress } from "./resolveENS.js";
import { calculateChecksum } from "../binary/index.js";
import {
    ChainTypeName,
    Checksum,
    InteroperableAddressText,
    interoperableAddressTextSchema,
    InteroperableName,
    InvalidChainIdentifier,
    InvalidChainNamespace,
    MissingInteroperableName,
    ParseInteropAddress,
} from "../internal.js";
import { toBinary } from "../text/index.js";
import { isValidChain, isValidChainType } from "./isValidChain.js";
import { parseInteropNameString } from "./parseInteropNameString.js";
import { resolveChainReference } from "./resolveChainReference.js";
import { resolveAddress } from "./resolveENS.js";

export interface ParsedInteroperableNameResult {
    name: ParsedInteropNameComponents;
    text: InteroperableAddressText;
    address: InteropAddress;
    meta: {
        checksum?: Checksum;
        isENS: boolean;
        isChainLabel: boolean;
        checksumMismatch?: { provided: Checksum; calculated: Checksum };
    };
}

/**
 * Parses an interoperable name (string or raw components) into a structured representation
 * with CAIP-350 text-encoded fields and binary address, plus checksum/ENS metadata.
 *
 * This function resolves ENS names and chain labels, preserving original values in the result.
 * The returned text object uses CAIP-350 text serialization rules (per chainType) for field encoding.
 *
 * @param input - Either an interoperable name string (e.g., "vitalik.eth@eip155:1") or parsed components from parseInteropNameString
 * @returns The parsed result with structured text (CAIP-350 encoded fields), binary address, and metadata
 * @throws An error if the parameters are invalid
 */
export const parseInteroperableName = async (
    input: string | ParsedInteropNameComponents,
): Promise<ParsedInteroperableNameResult> => {
    // If string, parse it first; otherwise use parsed components directly
    const parsed: ParsedInteropNameComponents =
        typeof input === "string"
            ? ((): ParsedInteropNameComponents => {
                  if (!input || input.trim() === "") {
                      throw new MissingInteroperableName();
                  }
                  return parseInteropNameString(input);
              })()
            : input;

    // Step 1: Validate name components
    // Validate chainType if provided
    if (parsed.chainType && !isValidChainType(parsed.chainType)) {
        throw new InvalidChainNamespace(parsed.chainType);
    }

    // Track metadata flags
    const isChainLabel = Boolean(parsed.chainReference && !/^\d+$/.test(parsed.chainReference));

    // Step 2: Resolve chain identifier (to namespace & reference)
    let resolvedChainNamespace: ChainTypeName | undefined;
    let resolvedChainRef: string | undefined;

    if (parsed.chainType && parsed.chainReference) {
        // We have both chainType and chainReference - use them directly, no resolution needed
        resolvedChainNamespace = parsed.chainType as ChainTypeName;
        resolvedChainRef = parsed.chainReference;

        // Validate the chain reference
        if (!isValidChain(resolvedChainNamespace, resolvedChainRef)) {
            throw new InvalidChainIdentifier(resolvedChainRef);
        }
    } else if (parsed.chainType) {
        // We have chainType but no chainReference
        resolvedChainNamespace = parsed.chainType as ChainTypeName;
    } else if (parsed.chainReference) {
        // We have chainReference but no chainType - resolve it (shortname to namespace/reference)
        const resolved = await resolveChainReference(parsed.chainReference);
        if (!resolved) {
            throw new InvalidChainIdentifier(
                `Chain reference "${parsed.chainReference}" could not be resolved to a valid chain type`,
            );
        }
        resolvedChainNamespace = resolved.chainType;
        resolvedChainRef = resolved.chainReference;
    }

    // Step 3: Resolve address (ENS resolution)
    // At this point, if we have an address, we must have a resolvedChainNamespace
    // (otherwise we would have failed at Step 4 when building the text)
    let resolved: ResolvedAddress | undefined;
    if (parsed.address && resolvedChainNamespace) {
        resolved = await resolveAddress(parsed.address, resolvedChainNamespace, resolvedChainRef);
    }

    // Step 4: Build text from resolved chain values and resolved address
    if (!resolvedChainNamespace) {
        throw new InvalidChainNamespace("Namespace is required to build InteroperableAddressText");
    }

    // Must have at least one of chain reference or address
    if (!resolvedChainRef && !resolved?.address) {
        throw new InvalidChainIdentifier(
            "InteroperableAddressText must have at least one of chainReference or address",
        );
    }

    const text: InteroperableAddressText = {
        version: 1,
        chainType: resolvedChainNamespace,
    };

    if (resolvedChainRef) {
        text.chainReference = resolvedChainRef;
    }

    // Use resolved address in text
    if (resolved) {
        text.address = resolved.address;
    }

    // Step 5: Validate with Zod
    const validated = interoperableAddressTextSchema.safeParse(text);
    if (!validated.success) {
        throw new ParseInteropAddress(validated.error);
    }

    const validatedText = validated.data;

    // Step 6: Convert text to binary (text already contains resolved address)
    const binaryAddress: InteropAddress = toBinary(validatedText);

    // Step 7: Calculate checksum from binary address (always generate, even if not provided)
    const calculatedChecksum = calculateChecksum(binaryAddress);

    // If a checksum was provided, check if it matches (but don't throw on mismatch)
    let checksum: Checksum | undefined;
    let checksumMismatch: { provided: Checksum; calculated: Checksum } | undefined;
    if (parsed.checksum) {
        const providedChecksum = parsed.checksum.toUpperCase() as Checksum;
        if (providedChecksum !== calculatedChecksum) {
            checksumMismatch = {
                provided: providedChecksum,
                calculated: calculatedChecksum,
            };
        }
        // Use the calculated checksum (not the provided one) for consistency
        checksum = calculatedChecksum;
    } else {
        checksum = calculatedChecksum;
    }

    return {
        name: parsed,
        text: validatedText,
        address: binaryAddress,
        meta: {
            checksum,
            ...(checksumMismatch && { checksumMismatch }),
            isENS: resolved ? resolved.isENS : false,
            isChainLabel,
        },
    };
};

/**
 * Formats a structured object with CAIP-350 text-encoded fields and checksum into an interoperable
 * name string.
 *
 * @param text - Structured object with fields using CAIP-350 text encoding rules (per chainType)
 * @param checksum - The checksum to include in the formatted name
 * @returns The interoperable name string in the format: `${address}@${chainType}:${chainReference}#${checksum}`
 * @example
 * ```ts
 * const text: InteroperableAddressText = {
 *   version: 1,
 *   chainType: "eip155",
 *   chainReference: "1",
 *   address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
 * };
 * const name = formatInteroperableName(text, "4CA88C9C");
 * // Returns: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C"
 * ```
 */
export const formatInteroperableName = (
    text: InteroperableAddressText,
    checksum: Checksum,
): InteroperableName => {
    const address = text.address ?? "";
    const chainType = text.chainType;
    const chainReference = text.chainReference ?? "";

    return `${address}@${chainType}:${chainReference}#${checksum}` as InteroperableName;
};

// Re-export name-specific utilities
export { isValidChain, isValidChainType, isViemChainId } from "./isValidChain.js";
export { resolveAddress } from "./resolveENS.js";
export { resolveChainReference } from "./resolveChainReference.js";
export { shortnameToChainId } from "./shortnameToChainId.js";

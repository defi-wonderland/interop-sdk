import type { InteroperableAddress } from "../internal.js";
import type { ParsedInteropNameComponents } from "./parseInteropNameString.js";
import type { ResolvedAddress } from "./resolveENS.js";
import { calculateChecksum } from "../binary/index.js";
import {
    Checksum,
    InteroperableAddressText,
    interoperableAddressTextSchema,
    InteroperableName,
    InvalidChainIdentifier,
    MissingInteroperableName,
    ParseInteropAddress,
} from "../internal.js";
import { toAddress } from "../text/index.js";
import { parseInteropNameString } from "./parseInteropNameString.js";
import { resolveChain } from "./resolveChain.js";
import { resolveAddress } from "./resolveENS.js";

export interface ParsedInteroperableNameResult {
    name: ParsedInteropNameComponents;
    text: InteroperableAddressText;
    address: InteroperableAddress;
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
export const parseName = async (
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

    // Track metadata flags
    const isChainLabel = !parsed.chainType;

    // Step 1: Resolve and validate chain identifier
    const resolvedChain = await resolveChain({
        chainType: parsed.chainType,
        chainReference: parsed.chainReference,
    });
    const resolvedChainType = resolvedChain.chainType;
    const resolvedChainRef = resolvedChain.chainReference;

    // Step 2: Resolve address (ENS resolution)
    let resolvedAddress: ResolvedAddress | undefined;
    if (parsed.address) {
        resolvedAddress = await resolveAddress(parsed.address, resolvedChainType, resolvedChainRef);
    }

    // Step 3: Build text from resolved chain values and resolved address

    // Must have at least one of chain reference or address
    if (!resolvedChainRef && !resolvedAddress?.address) {
        throw new InvalidChainIdentifier(
            "InteroperableAddressText must have at least one of chainReference or address",
        );
    }

    const text: InteroperableAddressText = {
        version: 1,
        chainType: resolvedChainType,
    };

    if (resolvedChainRef) {
        text.chainReference = resolvedChainRef;
    }

    // Use resolved address in text
    if (resolvedAddress) {
        text.address = resolvedAddress.address;
    }

    // Step 4: Validate with Zod
    const validated = interoperableAddressTextSchema.safeParse(text);
    if (!validated.success) {
        throw new ParseInteropAddress(validated.error);
    }

    const validatedText = validated.data;

    // Step 5: Convert text to binary (text already contains resolved address)
    const binaryAddress: InteroperableAddress = toAddress(validatedText);

    // Step 6: Calculate checksum from binary address (always generate, even if not provided)
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
            isENS: resolvedAddress ? resolvedAddress.isENS : false,
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
export const formatName = (
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
export { resolveChain } from "./resolveChain.js";
export { shortnameToChainId } from "./shortnameToChainId.js";

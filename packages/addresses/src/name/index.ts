import type {
    InteroperableAddress,
    InteroperableAddressBinary,
    InteroperableAddressText,
} from "../types/interopAddress.js";
import type { ParsedInteropNameComponents } from "./parseInteropNameString.js";
import type { ResolvedAddress } from "./resolveENS.js";
import {
    calculateChecksum,
    toBinaryRepresentation,
    toTextRepresentation,
    validateInteroperableAddress,
} from "../address/index.js";
import {
    Checksum,
    interoperableAddressTextSchema,
    InteroperableName,
    InvalidChainIdentifier,
    InvalidInteroperableAddress,
    MissingInteroperableName,
} from "../internal.js";
import { isTextAddress } from "../types/interopAddress.js";
import { parseInteropNameString } from "./parseInteropNameString.js";
import { resolveChain } from "./resolveChain.js";
import { resolveAddress } from "./resolveENS.js";

export interface ParsedInteroperableNameResult<
    T extends InteroperableAddress = InteroperableAddress,
> {
    name: ParsedInteropNameComponents;
    address: T;
    meta: {
        checksum?: Checksum;
        isENS: boolean;
        isChainLabel: boolean;
        checksumMismatch?: { provided: Checksum; calculated: Checksum };
    };
}

/**
 * Parses an interoperable name (string or raw components) into an address
 * representation with checksum/ENS metadata.
 *
 * This function resolves ENS names and chain labels, preserving original values in the result.
 * The returned address uses the specified representation (defaults to "text").
 *
 * @param input - Either an interoperable name string (e.g., "vitalik.eth@eip155:1") or parsed components from parseInteropNameString
 * @param opts - Parsing options
 * @param opts.representation - Representation to return: "binary" or "text" (defaults to "text")
 * @returns The parsed result with address in the specified representation and metadata
 * @throws An error if the parameters are invalid
 * @example
 * ```ts
 * // Get text representation (default)
 * const result = await parseName("vitalik.eth@eip155:1");
 *
 * // Get binary representation
 * const result2 = await parseName("vitalik.eth@eip155:1", { representation: "binary" });
 * ```
 */
export function parseName(
    input: string | ParsedInteropNameComponents,
    opts: { representation: "binary" },
): Promise<ParsedInteroperableNameResult<InteroperableAddressBinary>>;
export function parseName(
    input: string | ParsedInteropNameComponents,
    opts?: { representation?: "text" },
): Promise<ParsedInteroperableNameResult<InteroperableAddressText>>;
export async function parseName(
    input: string | ParsedInteropNameComponents,
    opts?: { representation?: "binary" | "text" },
): Promise<ParsedInteroperableNameResult> {
    const representation = opts?.representation ?? "text";
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

    // Step 3: Build text variant from resolved chain values and resolved address

    // Must have at least one of chain reference or address
    if (!resolvedChainRef && !resolvedAddress?.address) {
        throw new InvalidChainIdentifier(
            "InteroperableAddress must have at least one of chainReference or address",
        );
    }

    const textAddr: InteroperableAddress = {
        version: 1,
        chainType: resolvedChainType,
    };

    if (resolvedChainRef) {
        textAddr.chainReference = resolvedChainRef;
    }

    // Use resolved address in text
    if (resolvedAddress) {
        textAddr.address = resolvedAddress.address;
    }

    // Step 4: Validate with Zod
    const validated = interoperableAddressTextSchema.safeParse(textAddr);
    if (!validated.success) {
        throw new InvalidInteroperableAddress(validated.error);
    }

    const validatedText = validated.data;

    // Step 5: Convert to requested representation
    let address: InteroperableAddress;
    if (representation === "binary") {
        address = toBinaryRepresentation(validatedText);
    } else {
        address = validatedText;
    }

    // Step 6: Calculate checksum from address (always generate, even if not provided)
    const calculatedChecksum = calculateChecksum(address);

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
        address,
        meta: {
            checksum,
            ...(checksumMismatch && { checksumMismatch }),
            isENS: resolvedAddress ? resolvedAddress.isENS : false,
            isChainLabel,
        },
    };
}

/**
 * Formats an interoperable address into an interoperable name string.
 *
 * Accepts either binary or text representation and converts internally if needed.
 * Calculates the checksum automatically from the address.
 *
 * @param addr - Interoperable address (binary or text representation)
 * @param opts - Formatting options
 * @param opts.includeChecksum - Whether to include the checksum in the formatted name (defaults to true)
 * @returns The interoperable name string in the format: `${address}@${chainType}:${chainReference}#${checksum}`
 * @example
 * ```ts
 * // Format text representation (checksum included by default)
 * const textAddr = { version: 1, chainType: "eip155", chainReference: "1", address: "0x..." };
 * const name = formatName(textAddr);
 *
 * // Format binary representation
 * const binaryAddr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045", { representation: "binary" });
 * const name2 = formatName(binaryAddr);
 *
 * // Format without checksum
 * const name3 = formatName(textAddr, { includeChecksum: false });
 * ```
 */
export const formatName = (
    addr: InteroperableAddress,
    opts?: { includeChecksum?: boolean },
): InteroperableName => {
    const includeChecksum = opts?.includeChecksum ?? true;

    // Validate input first (handles both binary and text representations)
    const validated = validateInteroperableAddress(addr);

    // Convert to text if needed
    const textAddr = isTextAddress(validated) ? validated : toTextRepresentation(validated);

    const address = textAddr.address ?? "";
    const chainType = textAddr.chainType;
    const chainReference = textAddr.chainReference ?? "";

    if (includeChecksum) {
        // Calculate checksum from the validated address (may be binary or text)
        const calculatedChecksum = calculateChecksum(validated);
        return `${address}@${chainType}:${chainReference}#${calculatedChecksum}` as InteroperableName;
    }

    return `${address}@${chainType}:${chainReference}` as InteroperableName;
};

// Re-export name-specific utilities
export { isValidChain, isValidChainType, isViemChainId } from "./isValidChain.js";
export { resolveAddress } from "./resolveENS.js";
export { resolveChain } from "./resolveChain.js";
export { shortnameToChainId } from "./shortnameToChainId.js";

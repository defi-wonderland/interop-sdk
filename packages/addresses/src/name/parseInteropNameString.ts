import { InvalidInteroperableName } from "../internal.js";
import { isValidChainType } from "./isValidChain.js";

/**
 * Parsed components from an Interoperable Name string
 */
export interface ParsedInteropNameComponents {
    address?: string;
    chainType: string | undefined;
    chainReference: string;
    checksum: string | undefined;
}

const INTEROP_NAME_REGEX = new RegExp(
    "^" +
        "(?<address>[.\\-:_%a-zA-Z0-9]*)" + // Address part
        "@" + // Separator
        "(?:(?<chainType>[-a-z0-9]{3,8}):)?" + // Chain type with :
        "(?<chain>[\\-_a-zA-Z0-9]*)?" + // Chain reference
        "(?:#(?<checksum>[A-F0-9]{8}))?" + // Checksum with #
        "$",
);

/**
 * Parses an Interoperable Name string into raw components using regex
 *
 * If there is a <chain> but no <chainType>, checks if the <chain> is a valid chain type.
 * If it is, returns it as the chainType (with chain empty). Otherwise, returns it as chainReference.
 *
 * @param value - The Interoperable Name string (e.g., "alice.eth@eip155:1#ABCD1234")
 * @returns Raw components extracted from the string
 * @throws {InvalidInteroperableName} If the string doesn't match the expected format
 */
export function parseInteropNameString(value: string): ParsedInteropNameComponents {
    const match = value.match(INTEROP_NAME_REGEX);

    if (!match || !match.groups) {
        throw new InvalidInteroperableName(value);
    }

    let chainType: string | undefined = match.groups.chainType || undefined;
    let chainReference: string = match.groups.chain || "";

    // If there's a chain but no chainType, check if chain is a valid chain type
    if (!chainType && chainReference) {
        if (isValidChainType(chainReference)) {
            // Chain value is a valid chain type, treat it as chainType-only
            chainType = chainReference;
            chainReference = "";
        }
        // Otherwise, keep chainReference as is (chainType remains undefined)
    }

    return {
        address: match.groups.address || undefined,
        chainType,
        chainReference,
        checksum: match.groups.checksum || undefined,
    };
}

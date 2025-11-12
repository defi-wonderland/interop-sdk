import { InvalidHumanReadableAddress } from "../internal.js";

/**
 * Raw components extracted from an Interoperable Name string
 */
export interface RawInteropNameComponents {
    address: string;
    namespace: string | undefined;
    chain: string;
    checksum: string | undefined;
}

const INTEROP_NAME_REGEX = new RegExp(
    "^" +
        "(?<address>[.\\-:_%a-zA-Z0-9]*)" + // Address part
        "@" + // Separator
        "(?:(?<namespace>[-a-z0-9]{3,8}):)?" + // Namespace with :
        "(?<chain>[\\-_a-zA-Z0-9]*)?" + // Chain reference
        "(?:#(?<checksum>[A-F0-9]{8}))?" + // Checksum with #
        "$",
);

/**
 * Parses an Interoperable Name string into raw components using regex
 *
 * @param value - The Interoperable Name string (e.g., "alice.eth@eip155:1#ABCD1234")
 * @returns Raw components extracted from the string
 * @throws {InvalidHumanReadableAddress} If the string doesn't match the expected format
 */
export function parseInteropAddressString(value: string): RawInteropNameComponents {
    const match = value.match(INTEROP_NAME_REGEX);

    if (!match || !match.groups) {
        throw new InvalidHumanReadableAddress(value);
    }

    return {
        address: match.groups.address || "",
        namespace: match.groups.namespace || undefined,
        chain: match.groups.chain || "",
        checksum: match.groups.checksum || undefined,
    };
}

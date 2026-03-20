import type { ChainIdentifier, ChainIdentifierParts } from "../internal.js";
import { ChainTypeName, InvalidChainIdentifier } from "../internal.js";

/**
 * Converts a chain reference to a CAIP-350 chain identifier (e.g. `"eip155:1"`, `"bip122:000000000019d6689c085ae165831e93"`).
 *
 * @see https://standards.chainagnostic.org/CAIPs/caip-350#chain-identifier-text-representation
 *
 * @param chainReference - Chain reference (e.g. 1, "42161", "000000000019d6689c085ae165831e93")
 * @param chainType - Chain type namespace (default: "eip155" for EVM chains)
 * @returns CAIP-350 chain identifier (e.g. "eip155:1")
 */
export function toChainIdentifier(
    chainReference: string | number,
    chainType: ChainTypeName = ChainTypeName.EIP155,
): ChainIdentifier {
    return `${chainType}:${chainReference}`;
}

/**
 * Parses a CAIP-350 chain identifier (e.g. `"eip155:1"`) into its constituent parts.
 *
 * This is the inverse of {@link toChainIdentifier}.
 *
 * @see https://standards.chainagnostic.org/CAIPs/caip-350#chain-identifier-text-representation
 *
 * @param chainIdentifier - CAIP-350 chain identifier (e.g. "eip155:1", "bip122:000000000019d6689c085ae165831e93")
 * @returns An object containing the `chainReference` (string) and `chainType` ({@link ChainTypeName})
 * @throws {InvalidChainIdentifier} If the identifier is not in valid `namespace:reference` format
 *   or the namespace is not a known {@link ChainTypeName}
 */
export function fromChainIdentifier(chainIdentifier: string): ChainIdentifierParts {
    const sepIndex = chainIdentifier.indexOf(":");
    if (sepIndex === -1 || sepIndex === 0 || sepIndex === chainIdentifier.length - 1) {
        throw new InvalidChainIdentifier(chainIdentifier);
    }

    const namespace = chainIdentifier.slice(0, sepIndex);
    if (!Object.values(ChainTypeName).includes(namespace as ChainTypeName)) {
        throw new InvalidChainIdentifier(chainIdentifier);
    }

    const chainReference = chainIdentifier.slice(sepIndex + 1);

    return { chainReference, chainType: namespace as ChainTypeName };
}

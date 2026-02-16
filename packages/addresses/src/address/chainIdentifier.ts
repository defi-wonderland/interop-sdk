import { ChainTypeName } from "../internal.js";

/**
 * Convert a numeric chain reference to a CAIP-350 chain identifier string.
 *
 * CAIP-350 defines the canonical chain identifier format used by EIP-7930
 * interoperable addresses: `chainType:chainReference`
 * (e.g., `"eip155:1"` for Ethereum mainnet, `"eip155:42161"` for Arbitrum).
 *
 * @see https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-350.md
 *
 * @param chainReference - Numeric chain reference (e.g. 1, 42161)
 * @param chainType - Chain type namespace (default: "eip155" for EVM chains)
 * @returns CAIP-350 chain identifier (e.g. "eip155:1")
 *
 * @example
 * ```typescript
 * toChainIdentifier(1)      // "eip155:1"
 * toChainIdentifier(42161)  // "eip155:42161"
 * ```
 */
export function toChainIdentifier(
    chainReference: number,
    chainType: ChainTypeName = ChainTypeName.EIP155,
): string {
    return `${chainType}:${chainReference}`;
}

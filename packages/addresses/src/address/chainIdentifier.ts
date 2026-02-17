import { ChainTypeName } from "../internal.js";

/**
 * Converts a numeric chain reference to a CAIP-350 chain identifier (e.g. `"eip155:1"`).
 *
 * @see https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-350.md
 *
 * @param chainReference - Numeric chain reference (e.g. 1, 42161)
 * @param chainType - Chain type namespace (default: "eip155" for EVM chains)
 * @returns CAIP-350 chain identifier (e.g. "eip155:1")
 */
export function toChainIdentifier(
    chainReference: number,
    chainType: ChainTypeName = ChainTypeName.EIP155,
): string {
    return `${chainType}:${chainReference}`;
}

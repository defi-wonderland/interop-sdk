import { ChainTypeName, shortnameToChainId } from "../internal.js";

/**
 * Resolves a chain reference to its final string representation.
 * For eip155, resolves shortnames (like "eth", "base") to chain IDs.
 * For other chain types, returns the reference as-is.
 *
 * @param chainNamespace - The chain namespace (e.g., "eip155", "solana")
 * @param chainReference - The chain reference (can be chain ID, hex, or shortname)
 * @returns The resolved chain reference as a string
 */
export const resolveChainReference = async (
    chainNamespace: ChainTypeName,
    chainReference: string,
): Promise<string> => {
    switch (chainNamespace) {
        case "eip155": {
            const resolvedChainId = await shortnameToChainId(chainReference);
            return resolvedChainId?.toString() ?? chainReference;
        }
        case "solana":
            return chainReference;
        default:
            return chainReference;
    }
};

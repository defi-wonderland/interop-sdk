import {
    BytesConversionFailed,
    ChainTypeName,
    convertToBytes,
    InvalidChainNamespace,
    InvalidChainReference,
    InvalidDecimal,
    shortnameToChainId,
} from "../internal.js";

/**
 * Parses a chain reference string into a Uint8Array, resolving shortnames if needed
 * @param chainNamespace - The chain namespace (e.g., "eip155", "solana")
 * @param chainReference - The chain reference (can be hex, numeric, shortname, or base58)
 * @returns The parsed chain reference as a Uint8Array
 * @throws {InvalidChainNamespace} If the chain namespace is not supported
 * @throws {InvalidChainReference} If the chain reference format is invalid
 */
export const parseChainReferenceString = async (
    chainNamespace: ChainTypeName,
    chainReference: string,
): Promise<Uint8Array> => {
    try {
        switch (chainNamespace) {
            case "eip155": {
                const resolvedChainId = await shortnameToChainId(chainReference);
                const finalChainReference = resolvedChainId?.toString() ?? chainReference;
                return convertToBytes(finalChainReference, "decimal");
            }
            case "solana":
                return convertToBytes(chainReference, "base58");
            default:
                throw new InvalidChainNamespace(chainNamespace);
        }
    } catch (error) {
        if (error instanceof InvalidChainNamespace) {
            throw error;
        }

        if (error instanceof InvalidDecimal) {
            throw new InvalidChainReference(
                `Invalid EIP155 chain reference '${chainReference}'. Expected a number (e.g., '1', '8453'), hex (e.g., '0x1'), or chain label (e.g., 'eth', 'base').`,
            );
        }

        if (error instanceof BytesConversionFailed) {
            throw new InvalidChainReference(
                `Invalid Solana chain reference '${chainReference}'. Expected a base58 string (e.g., '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d').`,
            );
        }

        throw error;
    }
};

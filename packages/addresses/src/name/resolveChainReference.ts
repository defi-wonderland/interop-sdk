import { ChainTypeName, ChainTypeName as ChainTypeNameEnum } from "../constants/interopAddress.js";
import { shortnameToChainId } from "./shortnameToChainId.js";

/**
 * Resolves a chain reference to its chain type and reference.
 * Resolves shortnames (like "eth", "base") to eip155 chain IDs.
 * If the reference cannot be resolved, returns null.
 *
 * @param chainReference - The chain reference (can be chain ID, hex, or shortname)
 * @returns Object with chainType and chainReference if resolved, null otherwise
 */
export const resolveChainReference = async (
    chainReference: string,
): Promise<{ chainType: ChainTypeName; chainReference: string } | null> => {
    const resolvedChainId = await shortnameToChainId(chainReference);
    if (resolvedChainId) {
        return {
            chainType: ChainTypeNameEnum.EIP155,
            chainReference: resolvedChainId.toString(),
        };
    }
    return null;
};

import { ChainTypeName, ChainTypeName as ChainTypeNameEnum } from "../constants/interopAddress.js";
import { InvalidChainIdentifier, InvalidChainNamespace } from "../internal.js";
import { isValidChain, isValidChainType } from "./isValidChain.js";
import { shortnameToChainId } from "./shortnameToChainId.js";

export interface ResolveChainInput {
    chainType?: string;
    chainReference?: string;
}

export interface ResolvedChain {
    chainType: ChainTypeName;
    chainReference?: string;
}

/**
 * Resolves and validates chain identifier components.
 *
 * Handles three cases:
 * 1. Both chainType and chainReference provided: validates both and returns them
 * 2. Only chainType provided: validates and returns it (chainReference is undefined)
 * 3. Only chainReference provided: resolves shortname to chainType/chainReference, throws if can't resolve
 *
 * @param input - Object with optional chainType and chainReference
 * @returns Resolved chain with chainType (always) and chainReference (if available)
 * @throws {InvalidChainNamespace} If chainType is invalid
 * @throws {InvalidChainIdentifier} If chainReference can't be resolved or chain combination is invalid
 */
export const resolveChain = async (input: ResolveChainInput): Promise<ResolvedChain> => {
    const { chainType, chainReference } = input;

    // Case 1: Both chainType and chainReference provided
    if (chainType && chainReference) {
        // Validate chainType
        if (!isValidChainType(chainType)) {
            throw new InvalidChainNamespace(chainType);
        }

        const resolvedChainType = chainType as ChainTypeName;

        // Validate the chain combination
        if (!isValidChain(resolvedChainType, chainReference)) {
            throw new InvalidChainIdentifier(chainReference);
        }

        return {
            chainType: resolvedChainType,
            chainReference,
        };
    }

    // Case 2: Only chainType provided
    if (chainType) {
        // Validate chainType
        if (!isValidChainType(chainType)) {
            throw new InvalidChainNamespace(chainType);
        }

        return {
            chainType: chainType as ChainTypeName,
            // chainReference is undefined
        };
    }

    // Case 3: Only chainReference provided - resolve it
    if (chainReference) {
        const resolvedChainId = await shortnameToChainId(chainReference);
        if (resolvedChainId) {
            return {
                chainType: ChainTypeNameEnum.EIP155,
                chainReference: resolvedChainId.toString(),
            };
        }

        throw new InvalidChainIdentifier(
            `Chain reference "${chainReference}" could not be resolved to a valid chain type`,
        );
    }

    // Case 4: Neither provided - error
    throw new InvalidChainNamespace("Chain type is required to build InteroperableAddress");
};

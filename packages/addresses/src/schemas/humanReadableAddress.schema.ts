import { z } from "zod";

import {
    CHAIN_TYPE,
    ChainTypeName,
    InvalidChainIdentifier,
    InvalidChainNamespace,
    isValidChain,
    MissingHumanReadableAddress,
    shortnameToChainId,
} from "../internal.js";
import { interpretInteropNameComponents } from "../utils/interpretInteropNameComponents.js";
import { parseInteropAddressString } from "../utils/parseInteropAddressString.js";

/**
 * Zod schema for validating and transforming Interoperable Name strings
 */
export const HumanReadableAddressSchema = z.string().transform(async (value) => {
    if (!value || value.trim() === "") {
        throw new MissingHumanReadableAddress();
    }

    const raw = parseInteropAddressString(value);
    const interpreted = interpretInteropNameComponents(raw, value);
    const { address, chainNamespace, chainReference, checksum, isENSName } = interpreted;

    if (!(chainNamespace in CHAIN_TYPE)) {
        throw new InvalidChainNamespace(chainNamespace);
    }

    const resolvedChainId = await shortnameToChainId(chainReference);
    const finalChainReference = resolvedChainId ? resolvedChainId.toString() : chainReference;

    if (
        finalChainReference &&
        !isValidChain(chainNamespace as ChainTypeName, finalChainReference)
    ) {
        throw new InvalidChainIdentifier(finalChainReference);
    }

    return {
        address,
        chainNamespace,
        chainReference: finalChainReference,
        checksum,
        isENSName,
    };
});

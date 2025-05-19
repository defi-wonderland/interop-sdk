import { z } from "zod";

import {
    CHAIN_TYPE,
    ChainTypeName,
    InvalidChainIdentifier,
    InvalidChainNamespace,
    InvalidHumanReadableAddress,
    isValidChain,
    MissingHumanReadableAddress,
    shortnameToChainId,
} from "../internal.js";

export const HumanReadableAddressSchema = z.string().transform((value) => {
    if (!value || value.trim() === "") {
        throw new MissingHumanReadableAddress();
    }

    const match = value.match(
        /^([.\-:_%a-zA-Z0-9]*)@(?:([-a-z0-9]{3,8}):)?([\-_a-zA-Z0-9]*)?#?([A-F0-9]{8})?$/,
    );
    if (!match) throw new InvalidHumanReadableAddress(value);

    const [, address, namespace, chain, checksum] = match;
    let chainNamespace = namespace;

    if (!chainNamespace) {
        chainNamespace = "eip155";
    }

    if (chainNamespace && !(chainNamespace in CHAIN_TYPE)) {
        throw new InvalidChainNamespace(chainNamespace);
    }

    let chainReference = chain || "";
    const chainId = shortnameToChainId(chainReference);
    if (chainId) {
        chainReference = chainId.toString();
    }

    if (chainReference && !isValidChain(chainNamespace as ChainTypeName, chainReference)) {
        throw new InvalidChainIdentifier(chainReference);
    }

    return {
        address: address || "",
        chainNamespace,
        chainReference: chainReference || "",
        checksum,
    };
});

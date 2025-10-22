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

export const HumanReadableAddressSchema = z.string().transform(async (value) => {
    if (!value || value.trim() === "") {
        throw new MissingHumanReadableAddress();
    }

    const match = value.match(
        /^([.\-:_%a-zA-Z0-9]*)@(?:([-a-z0-9]{3,8}):)?([\-_a-zA-Z0-9]*)?(?:#([A-F0-9]{8}))?$/,
    );
    if (!match) throw new InvalidHumanReadableAddress(value);

    const [, address, namespace, chain, checksum] = match;
    let chainNamespace = namespace;
    let chainPart = chain;

    // ERC-7828: If address looks like an ENS name, chainReference MUST be specified
    // Check this BEFORE any reassignment to avoid false positives
    const isENSName = address && address.includes(".");
    if (isENSName && !chain) {
        throw new InvalidHumanReadableAddress(
            `${value} - ENS names require a specific chain reference (e.g., @eip155:1 or @ethereum). Use @<namespace>:<reference> format.`,
        );
    }

    // Additional check: ENS names with namespace-only format (e.g., vitalik.eth@eip155#) are invalid
    // They must have both namespace AND reference (e.g., vitalik.eth@eip155:1#)
    // This handles cases where the regex captures eip155 as chain instead of namespace
    if (isENSName && !namespace && chain && chain in CHAIN_TYPE) {
        throw new InvalidHumanReadableAddress(
            `${value} - ENS names require a specific chain reference (e.g., @eip155:1 or @ethereum). Use @<namespace>:<reference> format.`,
        );
    }

    // If no namespace was captured but chain looks like a namespace (e.g., @eip155#),
    // treat it as namespace-only format
    if (!chainNamespace && chainPart && chainPart in CHAIN_TYPE) {
        chainNamespace = chainPart;
        chainPart = "";
    }

    if (!chainNamespace) {
        chainNamespace = "eip155";
    }

    if (chainNamespace && !(chainNamespace in CHAIN_TYPE)) {
        throw new InvalidChainNamespace(chainNamespace);
    }

    const chainId = await shortnameToChainId(chainPart || "");
    const chainReference = chainId ? chainId.toString() : (chainPart ?? "");

    if (chainReference && !isValidChain(chainNamespace as ChainTypeName, chainReference)) {
        throw new InvalidChainIdentifier(chainReference);
    }

    return {
        address: address || "",
        chainNamespace,
        chainReference: chainReference || "",
        checksum: checksum || undefined,
        isENSName,
    };
});

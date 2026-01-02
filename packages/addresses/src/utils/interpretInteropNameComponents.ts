import type { RawInteropNameComponents } from "./parseInteropAddressString.js";
import { CHAIN_TYPE, InvalidHumanReadableAddress } from "../internal.js";

/**
 * Interpreted components with business logic applied
 */
export interface InterpretedInteropName {
    address: string;
    chainNamespace: string;
    chainReference: string;
    checksum: string | undefined;
    isENSName: boolean;
}

/**
 * Interprets chain components handling format ambiguities:
 * - @eip155:1 → namespace="eip155", chain="1"
 * - @eip155   → namespace="eip155", chain=""
 * - @eth      → namespace="eip155", chain="eth" (default namespace)
 */
function interpretChainComponents(
    namespace: string | undefined,
    chain: string,
): { chainNamespace: string; chainReference: string } {
    if (namespace && chain) {
        return { chainNamespace: namespace, chainReference: chain };
    }

    if (namespace && !chain) {
        return { chainNamespace: namespace, chainReference: "" };
    }

    if (!namespace && chain) {
        // If chain looks like a known namespace, treat it as namespace-only
        if (chain in CHAIN_TYPE) {
            return { chainNamespace: chain, chainReference: "" };
        }

        // Reject numeric chain references without explicit namespace (per ERC-7930/7828)
        // Numeric references like "1", "8453" require explicit namespace format: @eip155:1
        if (/^\d+$/.test(chain)) {
            throw new InvalidHumanReadableAddress(
                `Numeric chain references require an explicit namespace. Use @<namespace>:<reference> format (e.g., @eip155:1 instead of @1).`,
            );
        }

        return { chainNamespace: "eip155", chainReference: chain };
    }

    return { chainNamespace: "eip155", chainReference: "" };
}

function isENSName(address: string): boolean {
    return address.length > 0 && address.includes(".");
}

/**
 * Validates ERC-7828 requirement: ENS names MUST include chain reference
 */
function validateENSRequirement(
    isENS: boolean,
    chainReference: string,
    originalValue: string,
): void {
    if (isENS && !chainReference) {
        throw new InvalidHumanReadableAddress(
            `${originalValue} - ENS names require a specific chain reference (e.g., @eip155:1 or @ethereum). ` +
                `Use @<namespace>:<reference> format.`,
        );
    }
}

/**
 * Interprets raw components into business meaning, applying validation rules
 *
 * @param raw - Raw components from parseInteropAddressString
 * @param originalValue - Original input string for error messages
 * @returns Fully interpreted components
 * @throws {InvalidHumanReadableAddress} If validation fails (e.g., ENS without chain reference)
 */
export function interpretInteropNameComponents(
    raw: RawInteropNameComponents,
    originalValue: string,
): InterpretedInteropName {
    const { address, namespace, chain, checksum } = raw;

    const { chainNamespace, chainReference } = interpretChainComponents(namespace, chain);
    const isENS = isENSName(address);

    validateENSRequirement(isENS, chainReference, originalValue);

    return {
        address,
        chainNamespace,
        chainReference,
        checksum,
        isENSName: isENS,
    };
}

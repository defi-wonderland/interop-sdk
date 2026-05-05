import { DEFAULT_CHAIN_SHORTNAME_MAP } from "../internal.js";

/**
 * Fetches the shortname to chain id map from the chainid.network API.
 *
 * @returns {Promise<Record<string, number>>} The shortname to chain id map.
 */
const fetchShortnameToChainId = async (): Promise<Record<string, number>> => {
    try {
        const response = await fetch("https://chainid.network/chains_mini.json");
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const chains = (await response.json()) as { shortName: string; chainId: number }[];
        const shortNameToChainIdObj = chains.reduce(
            (acc: Record<string, number>, chain: { shortName: string; chainId: number }) => {
                if (chain.shortName && chain.chainId != null) {
                    acc[chain.shortName] = chain.chainId;
                }
                return acc;
            },
            {},
        );

        return shortNameToChainIdObj;
    } catch (error) {
        console.error("Error fetching shortname to chain id", error);
        return {};
    }
};

const shortnameToChainIdMap: Promise<Record<string, number>> =
    process.env.NODE_ENV !== "test"
        ? fetchShortnameToChainId()
        : Promise.resolve(DEFAULT_CHAIN_SHORTNAME_MAP);

/**
 * Resolves a chain shortname to its chain ID.
 *
 * Fetches the shortname to chain ID mapping from chainid.network API.
 * Falls back to a default map if the API call fails.
 *
 * @param shortName - The chain shortname (e.g., "eth", "base", "polygon")
 * @returns The chain ID if found, undefined otherwise
 * @example
 * ```ts
 * const chainId = await shortnameToChainId("eth");
 * // Returns: 1
 * ```
 */
export const shortnameToChainId = async (shortName: string): Promise<number | undefined> => {
    return (await shortnameToChainIdMap)[shortName];
};

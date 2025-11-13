import axios from "axios";

import { DEFAULT_CHAIN_SHORTNAME_MAP } from "../internal.js";

/**
 * Fetches the shortname to chain id map from the chainid.network API.
 *
 * @returns {Promise<Record<string, number>>} The shortname to chain id map.
 */
const fetchShortnameToChainId = async (): Promise<Record<string, number>> => {
    try {
        const response = await axios.get<{ shortName: string; chainId: number }[]>(
            "https://chainid.network/chains_mini.json",
        );
        const chains = response.data;
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

// TODO: try to remove await for this function
export const shortnameToChainId = async (shortName: string): Promise<number | undefined> => {
    return (await shortnameToChainIdMap)[shortName];
};

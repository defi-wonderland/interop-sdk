import axios from "axios";

import { DEFAULT_CHAIN_SHORTNAME_MAP } from "./defaultShortnameMap.js";

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

// Only fetch the shortname to chain id map if we're not running in test mode
let CHAIN_SHORTNAME_TO_ID_MAP: Record<string, number> = DEFAULT_CHAIN_SHORTNAME_MAP;
if (process.env.NODE_ENV !== "test") {
    CHAIN_SHORTNAME_TO_ID_MAP = (await fetchShortnameToChainId()) || DEFAULT_CHAIN_SHORTNAME_MAP;
}

export { CHAIN_SHORTNAME_TO_ID_MAP };

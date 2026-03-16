export const LIFI_INTENTS_ORDER_SERVER_URL = "https://order.li.fi";
export const LIFI_INTENTS_ORDER_SERVER_DEV_URL = "https://order-dev.li.fi";

export const LIFI_INTENTS_SUPPORTED_CHAIN_IDS = [1, 8453, 10, 1868, 42161] as const;

export const LIFI_INTENTS_CONTRACTS = {
    inputSettlerEscrow: "0x000025c3226C00B2Cdc200005a1600509f4e00C0",
    inputSettlerCompact: "0x0000000000cd5f7fDEc90a03a31F79E5Fbc6A9Cf",
    outputSettler: "0x0000000000eC36B683C2E6AC89e9A75989C22a2e",
    theCompact: "0x00000000000000171ede64904551eeDF3C6C9788",
    polymerOracleMainnet: "0x0000003E06000007A224AeE90052fA6bb46d43C9",
} as const;

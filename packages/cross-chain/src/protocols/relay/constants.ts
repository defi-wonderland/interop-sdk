/** Relay API base URLs for mainnet and testnet. */
const RELAY_API_URLS = {
    mainnet: "https://api.relay.link",
    testnet: "https://api.testnets.relay.link",
} as const;

/** Returns the Relay API base URL for the given network environment. */
export function getRelayApiUrl(isTestnet: boolean = false): string {
    return isTestnet ? RELAY_API_URLS.testnet : RELAY_API_URLS.mainnet;
}

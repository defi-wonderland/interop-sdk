/**
 * Relay Protocol API URLs
 * @see https://docs.relay.link/
 */
const RELAY_API_URLS = {
    mainnet: "https://api.relay.link",
    testnet: "https://api.testnets.relay.link",
} as const;

/**
 * Get Relay API URL based on network configuration
 * @param isTestnet - Whether to use testnet (defaults to false for mainnet)
 * @returns The appropriate API URL
 */
export function getRelayApiUrl(isTestnet: boolean = false): string {
    return isTestnet ? RELAY_API_URLS.testnet : RELAY_API_URLS.mainnet;
}

export { RELAY_API_URLS };

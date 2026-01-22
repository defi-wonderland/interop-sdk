/**
 * Network configuration
 * Reads from URL query params to determine if testnet should be used
 */

const TESTNET_QUERY_PARAM = 'testnet';

/**
 * Get the current network selection from URL
 * @returns true if testnet is selected, false for mainnet
 */
export function getIsTestnet(): boolean {
  if (typeof window === 'undefined') {
    return false; // Default to mainnet on SSR
  }
  const params = new URLSearchParams(window.location.search);
  return params.get(TESTNET_QUERY_PARAM) === 'true';
}

/**
 * Set the network selection by updating URL and reloading
 * @param isTestnet - true for testnet, false for mainnet
 */
export function setNetworkAndReload(isTestnet: boolean): void {
  const url = new URL(window.location.href);
  if (isTestnet) {
    url.searchParams.set(TESTNET_QUERY_PARAM, 'true');
  } else {
    url.searchParams.delete(TESTNET_QUERY_PARAM);
  }
  window.location.href = url.toString();
}

/**
 * Current network selection (evaluated once on module load)
 */
export const IS_TESTNET = getIsTestnet();

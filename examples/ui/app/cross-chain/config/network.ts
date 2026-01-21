/**
 * Network configuration
 * Reads from localStorage to determine if testnet should be used
 */

const NETWORK_STORAGE_KEY = 'interop-network-testnet';

/**
 * Get the current network selection
 * @returns true if testnet is selected, false for mainnet
 */
export function getIsTestnet(): boolean {
  if (typeof window === 'undefined') {
    return false; // Default to mainnet on SSR
  }
  const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
  return stored === 'true';
}

/**
 * Set the network selection and reload the page
 * @param isTestnet - true for testnet, false for mainnet
 */
export function setNetworkAndReload(isTestnet: boolean): void {
  localStorage.setItem(NETWORK_STORAGE_KEY, String(isTestnet));
  window.location.reload();
}

/**
 * Current network selection (evaluated once on module load)
 */
export const IS_TESTNET = getIsTestnet();

/**
 * Common chain ID to name mappings for display purposes
 */
const COMMON_CHAIN_NAMES: Record<string, string> = {
  '1': 'Ethereum',
  '10': 'Optimism',
  '137': 'Polygon',
  '8453': 'Base',
  '42161': 'Arbitrum One',
  '42170': 'Arbitrum Nova',
  '43114': 'Avalanche',
  '59144': 'Linea',
  '534352': 'Scroll',
  '7777777': 'Zora',
};

function getChainName(chainReference: string): string | null {
  return COMMON_CHAIN_NAMES[chainReference] || null;
}

export function formatChainReference(chainReference: string): string {
  const chainName = getChainName(chainReference);
  return chainName ? `${chainReference} (${chainName})` : chainReference;
}

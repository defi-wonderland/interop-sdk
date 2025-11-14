import { getChainId } from '@wonderland/interop-addresses';

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

export async function formatChainReference(chainReference: string, fullAddress: string): Promise<string> {
  const existingChainName = COMMON_CHAIN_NAMES[chainReference];

  if (existingChainName) {
    return `${chainReference} (${existingChainName})`;
  }

  const chainId = await getChainId(fullAddress);
  const newChainName = COMMON_CHAIN_NAMES[chainId.toString()];
  return `${chainId.toString()} (${newChainName})`;
}

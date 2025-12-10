export interface Chain {
  name: string;
  chainId: number;
  shortName: string;
}

/**
 * Fetches all available chains for demo purposes.
 * This allows users exploring interoperable addresses to easily select from all existing chains.
 */
export async function getChains(): Promise<Chain[]> {
  try {
    const response = await fetch('https://chainid.network/chains_mini.json');

    if (!response.ok) {
      throw new Error('Failed to fetch chains');
    }

    const data: Chain[] = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch chains:', error);
    return [];
  }
}

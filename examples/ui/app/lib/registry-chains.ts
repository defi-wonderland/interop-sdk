/**
 * Curated list of chains for the interoperable addresses feature.
 * Based on L2Beat's scaling summary: all rollups, all validiums/optimiums,
 * and the top 3 from the "others" category.
 *
 * This file is intentionally isolated so it can be moved to the SDK later.
 *
 * Last updated: 2025-03-13
 * @see https://l2beat.com/scaling/summary
 */

export interface RegistryChain {
  name: string;
  chainId: number;
  shortName: string;
}

export interface RegistryChainWithStatus extends RegistryChain {
  isRegistered: boolean;
}

export const REGISTRY_CHAINS: readonly RegistryChain[] = [
  // Ethereum
  { name: 'Ethereum Mainnet', chainId: 1, shortName: 'eth' },

  // Rollups
  { name: 'Arbitrum One', chainId: 42161, shortName: 'arb1' },
  { name: 'Base', chainId: 8453, shortName: 'base' },
  { name: 'OP Mainnet', chainId: 10, shortName: 'oeth' },
  { name: 'Katana', chainId: 747474, shortName: 'katana' },
  { name: 'Ink', chainId: 57073, shortName: 'ink' },
  { name: 'Linea', chainId: 59144, shortName: 'linea' },
  { name: 'ZKsync Era', chainId: 324, shortName: 'zksync' },
  { name: 'Unichain', chainId: 130, shortName: 'unichain' },
  { name: 'BOB', chainId: 60808, shortName: 'bob' },
  { name: 'Scroll', chainId: 534352, shortName: 'scr' },
  { name: 'Abstract', chainId: 2741, shortName: 'abstract' },
  { name: 'Morph', chainId: 2818, shortName: 'morph' },
  { name: 'ZERO Network', chainId: 543210, shortName: 'zero-network' },
  { name: 'Phala Network', chainId: 2035, shortName: 'phala' },

  // Validiums & Optimiums
  { name: 'Celo', chainId: 42220, shortName: 'celo' },
  { name: 'Sophon', chainId: 50104, shortName: 'sophon' },
  { name: 'Arbitrum Nova', chainId: 42170, shortName: 'arb-nova' },
  { name: 'Lens', chainId: 232, shortName: 'lens' },
  { name: 'Space and Time', chainId: 1217, shortName: 'eip155:1217' }, // not in chainid.network, use CAIP-2

  // Others (top 3 by TVL)
  { name: 'Polygon PoS', chainId: 137, shortName: 'pol' },
  { name: 'Mantle', chainId: 5000, shortName: 'mantle' },
  { name: 'World Chain', chainId: 480, shortName: 'wc' },
] as const;

/**
 * Curated list of chains for the interoperable addresses feature.
 * Based on L2Beat's scaling summary: all rollups, all validiums/optimiums,
 * and the top 3 from the "others" category.
 *
 * This file is intentionally isolated so it can be moved to the SDK later.
 *
 * Last updated: 2025-03-18
 * @see https://l2beat.com/scaling/summary
 */

export interface RegistryChain {
  name: string;
  chainType: string;
  chainReference: string;
  shortName: string;
}

export interface RegistryChainWithStatus extends RegistryChain {
  isRegistered: boolean;
}

export const REGISTRY_CHAINS: readonly RegistryChain[] = [
  // Ethereum
  { name: 'Ethereum Mainnet', chainType: 'eip155', chainReference: '1', shortName: 'eth' },

  // EVM Rollups
  { name: 'Arbitrum One', chainType: 'eip155', chainReference: '42161', shortName: 'arb1' },
  { name: 'Base', chainType: 'eip155', chainReference: '8453', shortName: 'base' },
  { name: 'OP Mainnet', chainType: 'eip155', chainReference: '10', shortName: 'oeth' },
  { name: 'Katana', chainType: 'eip155', chainReference: '747474', shortName: 'katana' },
  { name: 'Ink', chainType: 'eip155', chainReference: '57073', shortName: 'ink' },
  { name: 'Linea', chainType: 'eip155', chainReference: '59144', shortName: 'linea' },
  { name: 'ZKsync Era', chainType: 'eip155', chainReference: '324', shortName: 'zksync' },
  { name: 'Unichain', chainType: 'eip155', chainReference: '130', shortName: 'unichain' },
  { name: 'BOB', chainType: 'eip155', chainReference: '60808', shortName: 'bob' },
  { name: 'Scroll', chainType: 'eip155', chainReference: '534352', shortName: 'scr' },
  { name: 'Abstract', chainType: 'eip155', chainReference: '2741', shortName: 'abstract' },
  { name: 'Morph', chainType: 'eip155', chainReference: '2818', shortName: 'morph' },
  { name: 'ZERO Network', chainType: 'eip155', chainReference: '543210', shortName: 'zero-network' },
  { name: 'Phala Network', chainType: 'eip155', chainReference: '2035', shortName: 'phala' },

  // EVM Validiums & Optimiums
  { name: 'Celo', chainType: 'eip155', chainReference: '42220', shortName: 'celo' },
  { name: 'Sophon', chainType: 'eip155', chainReference: '50104', shortName: 'sophon' },
  { name: 'Arbitrum Nova', chainType: 'eip155', chainReference: '42170', shortName: 'arb-nova' },
  { name: 'Lens', chainType: 'eip155', chainReference: '232', shortName: 'lens' },

  // EVM Others (top 3 by TVL)
  { name: 'Polygon PoS', chainType: 'eip155', chainReference: '137', shortName: 'pol' },
  { name: 'Mantle', chainType: 'eip155', chainReference: '5000', shortName: 'mantle' },
  { name: 'World Chain', chainType: 'eip155', chainReference: '480', shortName: 'wc' },
] as const;

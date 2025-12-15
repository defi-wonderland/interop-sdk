import * as viemChains from 'viem/chains';

/**
 * Map of chain IDs to chain names from viem.
 */
export const viemChainNameMap: Record<number, string> = Object.values(viemChains).reduce<Record<number, string>>(
  (acc, chain) => {
    acc[chain.id] = chain.name;
    return acc;
  },
  {},
);

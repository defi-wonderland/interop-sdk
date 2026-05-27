import * as viemChains from 'viem/chains';
import type { Chain } from 'viem';

const CHAIN_NAME_BY_ID = new Map<number, string>(
  (Object.values(viemChains) as Chain[]).map((chain) => [chain.id, chain.name]),
);

export const getChainName = (chainId: number): string => CHAIN_NAME_BY_ID.get(chainId) ?? `Chain ${chainId}`;

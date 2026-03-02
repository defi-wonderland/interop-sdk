import { createPublicClient } from 'viem';
import { http } from 'wagmi';
import { ALL_CHAINS, ALL_RPC_URLS } from '../constants/chains';

export const isE2E = process.env.NEXT_PUBLIC_E2E === 'true';
const anvilUrl = process.env.NEXT_PUBLIC_ANVIL_URL;
const anvilChainId = Number(process.env.NEXT_PUBLIC_ANVIL_CHAIN_ID);
const hasAnvil = isE2E && !!anvilUrl && !!anvilChainId;

export const rpcUrls = hasAnvil ? { ...ALL_RPC_URLS, [anvilChainId]: anvilUrl } : ALL_RPC_URLS;

export function getPublicClient(chainId: number) {
  const chain = ALL_CHAINS.find((c) => c.id === chainId);
  if (!chain) throw new Error(`No chain configured for chainId ${chainId}`);
  return createPublicClient({ chain, transport: http(rpcUrls[chainId]) });
}

import { viemChainNameMap } from './viem-chains';

export function formatChainReference(chainReference: string): string {
  const chainId = parseInt(chainReference, 10);
  const chainName = !isNaN(chainId) ? viemChainNameMap[chainId] : undefined;

  return chainName ? `${chainReference} (${chainName})` : chainReference;
}

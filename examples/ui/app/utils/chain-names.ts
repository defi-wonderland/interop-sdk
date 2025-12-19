import { getChainId } from '@wonderland/interop-addresses';
import { viemChainNameMap } from './viem-chains';

export async function formatChainReference(chainReference: string, fullAddress: string): Promise<string> {
  const parsedChainId = parseInt(chainReference, 10);

  if (!isNaN(parsedChainId) && viemChainNameMap[parsedChainId]) {
    return `${chainReference} (${viemChainNameMap[parsedChainId]})`;
  }

  const resolvedChainId = Number(await getChainId(fullAddress));
  const chainName = viemChainNameMap[resolvedChainId];

  if (chainName) return `${chainReference} (${chainName})`;

  return chainReference;
}

import { getRegisteredChains } from '@wonderland/interop-addresses';
import { REGISTRY_CHAINS, type RegistryChainWithStatus } from './registry-chains';

/** Creates a unique key for deduplication: "chainType:chainReference" */
function chainKey(chainType: string, chainReference: string): string {
  return `${chainType}:${chainReference}`;
}

/** Merges the on.eth onchain registry with the curated list. */
export async function getChains(): Promise<RegistryChainWithStatus[]> {
  let onchainEntries: Awaited<ReturnType<typeof getRegisteredChains>>;

  try {
    onchainEntries = await getRegisteredChains({ rpcUrl: process.env.MAINNET_RPC_URL });
  } catch {
    onchainEntries = [];
  }

  const onchainKeys = new Set(onchainEntries.map((e) => chainKey(e.chainType, e.chainReference)));

  const result: RegistryChainWithStatus[] = onchainEntries.map((entry) => ({
    name: entry.name,
    chainType: entry.chainType,
    chainReference: entry.chainReference,
    shortName: entry.label,
    isRegistered: true,
  }));

  for (const chain of REGISTRY_CHAINS) {
    if (onchainKeys.has(chainKey(chain.chainType, chain.chainReference))) continue;
    result.push({ ...chain, isRegistered: false });
  }

  return result.sort((a, b) => {
    if (a.isRegistered !== b.isRegistered) return a.isRegistered ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

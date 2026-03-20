import { getRegisteredChains } from '@wonderland/interop-addresses';
import { REGISTRY_CHAINS, type RegistryChainWithStatus } from './registry-chains';

/** Merges the on.eth onchain registry with the curated list. */
export async function getChains(): Promise<RegistryChainWithStatus[]> {
  let onchainEntries: Awaited<ReturnType<typeof getRegisteredChains>>;

  try {
    onchainEntries = await getRegisteredChains({ rpcUrl: process.env.MAINNET_RPC_URL });
  } catch {
    onchainEntries = [];
  }

  const onchainKeys = new Set(onchainEntries.map((e) => `${e.chainType}:${e.chainReference}`));

  const result: RegistryChainWithStatus[] = onchainEntries.map((entry) => ({
    name: entry.name,
    chainType: entry.chainType,
    chainReference: entry.chainReference,
    shortName: entry.label,
    isRegistered: true,
  }));

  for (const chain of REGISTRY_CHAINS) {
    if (onchainKeys.has(`${chain.chainType}:${chain.chainReference}`)) continue;
    result.push({ ...chain, isRegistered: false });
  }

  return result.sort((a, b) => {
    if (a.isRegistered !== b.isRegistered) return a.isRegistered ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

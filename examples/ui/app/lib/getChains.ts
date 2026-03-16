import { getRegisteredChains } from '@wonderland/interop-addresses';
import { REGISTRY_CHAINS, type RegistryChainWithStatus } from './registry-chains';

/** Merges the on.eth onchain registry with the curated L2Beat list. */
export async function getChains(): Promise<RegistryChainWithStatus[]> {
  let onchainEntries: Awaited<ReturnType<typeof getRegisteredChains>>;

  try {
    onchainEntries = await getRegisteredChains({ rpcUrl: process.env.MAINNET_RPC_URL });
  } catch {
    onchainEntries = [];
  }

  const onchainChainIds = new Set(onchainEntries.map((e) => e.chainId));

  // Onchain entries first, using registry label as shortName (canonical)
  const result: RegistryChainWithStatus[] = onchainEntries.map((entry) => {
    return {
      name: entry.name,
      chainId: entry.chainId,
      shortName: entry.label,
      isRegistered: true,
    };
  });

  // Add curated chains that aren't already onchain
  for (const chain of REGISTRY_CHAINS) {
    if (onchainChainIds.has(chain.chainId)) continue;
    result.push({ ...chain, isRegistered: false });
  }

  return result.sort((a, b) => {
    if (a.isRegistered !== b.isRegistered) return a.isRegistered ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

import { getRegisteredChains } from '@wonderland/interop-addresses';
import { REGISTRY_CHAINS, type RegistryChainWithStatus } from './registry-chains';

/**
 * Max time we wait for the on.eth registry before falling back to the curated list.
 * Kept well under Next's 60s per-page prerender budget so a flaky RPC cannot block the build.
 */
const ONCHAIN_FETCH_TIMEOUT_MS = 10_000;

const timeout = (ms: number): Promise<never> =>
  new Promise((_, reject) => setTimeout(() => reject(new Error('on.eth registry fetch timed out')), ms));

/** Merges the on.eth onchain registry with the curated list. */
export async function getChains(): Promise<RegistryChainWithStatus[]> {
  let onchainEntries: Awaited<ReturnType<typeof getRegisteredChains>>;

  const fetchRegistry = getRegisteredChains({ rpcUrl: process.env.MAINNET_RPC_URL });

  try {
    onchainEntries = await Promise.race([fetchRegistry, timeout(ONCHAIN_FETCH_TIMEOUT_MS)]);
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

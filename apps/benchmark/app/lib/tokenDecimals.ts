import type { NetworkAssets } from '@wonderland/interop-cross-chain';

/**
 * Flattens the discovered chains into a `chainId:loweraddress -> decimals` map.
 *
 * The Across history service keys its decimals lookup on
 * `${chainId}:${tokenAddress.toLowerCase()}`, so the address must be
 * lowercased here to match (asset addresses come back checksummed).
 */
export function buildTokenDecimals(chains: NetworkAssets[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const network of chains) {
    for (const asset of network.assets) {
      map[`${network.chainId}:${asset.address.toLowerCase()}`] = asset.decimals;
    }
  }
  return map;
}

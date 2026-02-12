import { decodeAddress } from '@wonderland/interop-addresses';
import { type Address, erc20Abi, formatUnits, type Hex, isAddress } from 'viem';
import { getBalance, readContracts } from 'wagmi/actions';
import type { BalanceTarget, TokenBalance } from '../stores/balanceStore';
import type { DiscoveredAssets } from '../types/assets';
import type { Config } from 'wagmi';

const NATIVE_TOKEN_ADDRESSES = new Set([
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  '0x0000000000000000000000000000000000000000',
]);

function isNativeToken(address: string): boolean {
  return NATIVE_TOKEN_ADDRESSES.has(address.toLowerCase());
}

// TODO: SDK will return EIP-7930 interop addresses — all addresses will need decoding
function resolveEvmAddress(address: string): Address {
  if (isAddress(address)) return address;

  const decoded = decodeAddress(address as Hex);
  return decoded.address as Address;
}

export class AssetService {
  constructor(private config: Config) {}

  async fetchAllBalances(
    userAddress: string,
    discoveredAssets: DiscoveredAssets,
  ): Promise<Record<number, Record<string, TokenBalance>>> {
    const entries = Object.entries(discoveredAssets.supportedTokensByChain);
    const promises = entries.map(([chainIdStr, tokens]) => {
      const chainId = Number(chainIdStr);
      const chainInfo = discoveredAssets.tokenInfo[chainId] ?? {};
      return this.fetchChainBalances(chainId, tokens, userAddress, chainInfo);
    });

    const settled = await Promise.allSettled(promises);

    return settled.reduce<Record<number, Record<string, TokenBalance>>>((results, outcome, i) => {
      if (outcome.status === 'fulfilled') {
        results[Number(entries[i][0])] = outcome.value;
      }
      return results;
    }, {});
  }

  async fetchTargetedBalances(
    userAddress: string,
    targets: BalanceTarget[],
    discoveredAssets: DiscoveredAssets,
  ): Promise<Record<number, Record<string, TokenBalance>>> {
    const byChain = targets.reduce<Record<number, string[]>>((acc, { chainId, token }) => {
      (acc[chainId] ??= []).push(token);
      return acc;
    }, {});

    const entries = Object.entries(byChain);
    const promises = entries.map(([chainIdStr, tokens]) => {
      const chainId = Number(chainIdStr);
      const chainInfo = discoveredAssets.tokenInfo[chainId] ?? {};
      return this.fetchChainBalances(chainId, tokens, userAddress, chainInfo);
    });

    const settled = await Promise.allSettled(promises);

    return settled.reduce<Record<number, Record<string, TokenBalance>>>((results, outcome, i) => {
      if (outcome.status === 'fulfilled') {
        results[Number(entries[i][0])] = outcome.value;
      }
      return results;
    }, {});
  }

  async fetchChainBalances(
    chainId: number,
    tokens: readonly string[],
    userAddress: string,
    chainInfo: Record<string, { decimals: number }>,
  ): Promise<Record<string, TokenBalance>> {
    if (tokens.length === 0) return {};

    const owner = resolveEvmAddress(userAddress);
    const nativeTokens = tokens.filter(isNativeToken);
    const erc20Tokens = tokens.filter((t) => !isNativeToken(t));
    const balances: Record<string, TokenBalance> = {};

    if (nativeTokens.length > 0) {
      const native = await getBalance(this.config, { address: owner, chainId });
      for (const addr of nativeTokens) {
        balances[addr] = {
          raw: native.value,
          formatted: formatUnits(native.value, 18),
        };
      }
    }

    if (erc20Tokens.length === 0) return balances;

    const contracts = erc20Tokens.map((token) => ({
      address: resolveEvmAddress(token),
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [owner] as const,
      chainId,
    }));

    const results = await readContracts(this.config, { contracts });

    erc20Tokens.forEach((token, i) => {
      const result = results[i];
      if (result.status === 'success' && result.result !== undefined) {
        const decimals = chainInfo[token]?.decimals ?? 18;
        const value = result.result as bigint;
        balances[token] = {
          raw: value,
          formatted: formatUnits(value, decimals),
        };
      }
    });

    return balances;
  }
}

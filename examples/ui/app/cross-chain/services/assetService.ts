import { isNativeAddress } from '@wonderland/interop-cross-chain';
import { type Address, erc20Abi, formatUnits, isAddress } from 'viem';
import { getPublicClient } from '../config/publicClient';
import type { BalanceTarget, TokenBalance } from '../stores/balanceStore';
import type { DiscoveredAssets } from '../types/assets';

export class AssetService {
  private getClient(chainId: number) {
    return getPublicClient(chainId);
  }

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

    if (!isAddress(userAddress)) {
      throw new Error(`Invalid user address: ${userAddress}`);
    }
    const owner = userAddress as Address;
    const nativeTokens = tokens.filter((t) => isNativeAddress(t, 'eip155'));
    const erc20Tokens = tokens.filter((t) => !isNativeAddress(t, 'eip155'));
    const balances: Record<string, TokenBalance> = {};

    const client = this.getClient(chainId);

    if (nativeTokens.length > 0) {
      const native = await client.getBalance({ address: owner });
      for (const addr of nativeTokens) {
        balances[addr] = {
          raw: native,
          formatted: formatUnits(native, 18),
        };
      }
    }

    const validErc20Tokens = erc20Tokens.filter((token) => isAddress(token));
    if (validErc20Tokens.length === 0) return balances;

    const contracts = validErc20Tokens.map((token) => ({
      address: token as Address,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [owner] as const,
    }));

    const results = await client.multicall({ contracts });

    validErc20Tokens.forEach((token, i) => {
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

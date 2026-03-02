import { useState, useCallback, useMemo } from 'react';
import { useAccount, useConfig, useSwitchChain } from 'wagmi';
import { mintToken } from '../services/mintFlow';
import { useBalanceStore } from '../stores/balanceStore';
import type { Address } from 'viem';

/** Human-readable amount minted per click. */
export const MINT_AMOUNT = '100';

export function useMintToken(chainId: number, tokenAddress: string, decimals: number) {
  const [isLoading, setIsLoading] = useState(false);
  const { address, chainId: walletChainId } = useAccount();
  const config = useConfig();
  const { switchChainAsync } = useSwitchChain();
  const updateBalances = useBalanceStore((s) => s.updateBalances);

  const mint = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      await mintToken({
        config,
        walletChainId,
        targetChainId: chainId,
        tokenAddress: tokenAddress as Address,
        recipient: address,
        amount: MINT_AMOUNT,
        decimals,
        switchChainAsync,
      });
      await updateBalances(address, [{ chainId, token: tokenAddress }]);
    } catch {
      /* mint failed — user sees balance unchanged */
    } finally {
      setIsLoading(false);
    }
  }, [address, walletChainId, chainId, switchChainAsync, config, tokenAddress, decimals, updateBalances]);

  return useMemo(() => ({ mint, isLoading }), [mint, isLoading]);
}

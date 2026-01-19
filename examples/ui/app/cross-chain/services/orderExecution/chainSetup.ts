import { getPublicClient, getWalletClient } from 'wagmi/actions';
import { STEP, WALLET_ACTION, type BridgeState } from '../../types/execution';
import type { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';
import type { Config } from 'wagmi';

export type ConfiguredWalletClient = WalletClient<Transport, Chain, Account>;

export interface ChainClients {
  walletClient: ConfiguredWalletClient;
  publicClient: PublicClient;
}

export async function ensureCorrectChain(
  config: Config,
  currentChainId: number | undefined,
  targetChainId: number,
  switchChainAsync: (args: { chainId: number }) => Promise<unknown>,
  onStateChange: (state: BridgeState) => void,
): Promise<ChainClients> {
  if (currentChainId !== targetChainId) {
    onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.SWITCHING });
    await switchChainAsync({ chainId: targetChainId });
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const walletClient = await getWalletClient(config, { chainId: targetChainId });
  const publicClient = getPublicClient(config, { chainId: targetChainId });

  if (!walletClient || !publicClient) {
    throw new Error('Failed to get wallet client for origin chain');
  }

  if (walletClient.chain?.id !== targetChainId) {
    throw new Error('Wallet is not on the correct network. Please try again.');
  }

  return { walletClient, publicClient };
}

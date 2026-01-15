import { getPublicClient, getWalletClient } from 'wagmi/actions';
import { EXECUTION_STATUS, type IntentExecutionState } from '../../types/execution';
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
  onStateChange: (state: IntentExecutionState) => void,
): Promise<ChainClients> {
  if (currentChainId !== targetChainId) {
    onStateChange({
      status: EXECUTION_STATUS.SWITCHING_NETWORK,
      message: 'Please switch to the origin chain in your wallet...',
    });
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

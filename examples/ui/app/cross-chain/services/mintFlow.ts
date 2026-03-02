import { parseAbi, parseUnits, type Address } from 'viem';
import { waitForReceiptWithRetry } from '../utils/transactionReceipt';
import { ensureCorrectChain } from './orderExecution/chainSetup';
import type { Config } from 'wagmi';

const MINT_ABI = parseAbi(['function mint(address to, uint256 amount)']);

interface MintParams {
  config: Config;
  walletChainId: number | undefined;
  targetChainId: number;
  tokenAddress: Address;
  recipient: Address;
  amount: string;
  decimals: number;
  switchChainAsync: (args: { chainId: number }) => Promise<unknown>;
}

export async function mintToken({
  config,
  walletChainId,
  targetChainId,
  tokenAddress,
  recipient,
  amount,
  decimals,
  switchChainAsync,
}: MintParams) {
  const { walletClient, publicClient } = await ensureCorrectChain(
    config,
    walletChainId,
    targetChainId,
    switchChainAsync,
    () => {},
  );

  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: MINT_ABI,
    functionName: 'mint',
    args: [recipient, parseUnits(amount, decimals)],
    chain: walletClient.chain,
    account: walletClient.account,
  });

  await waitForReceiptWithRetry(publicClient, hash);
}

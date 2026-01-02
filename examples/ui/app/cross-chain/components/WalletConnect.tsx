'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';
import { TOKEN_INFO, DEFAULT_DECIMALS } from '../constants';
import { formatAmount, truncateAddress } from '../utils/formatting';

interface WalletConnectProps {
  selectedTokenAddress?: string;
}

export function WalletConnect({ selectedTokenAddress }: WalletConnectProps) {
  const { address, isConnected } = useAccount();

  const { data: nativeBalance } = useBalance({
    address: isConnected ? address : undefined,
  });

  const { data: tokenBalance } = useBalance({
    address: isConnected && selectedTokenAddress ? address : undefined,
    token: selectedTokenAddress as `0x${string}` | undefined,
  });

  const tokenInfo = selectedTokenAddress ? TOKEN_INFO[selectedTokenAddress] : null;
  const displayBalance = tokenBalance
    ? formatAmount(tokenBalance.value.toString(), tokenInfo?.decimals)
    : nativeBalance
      ? formatAmount(nativeBalance.value.toString(), DEFAULT_DECIMALS)
      : '0.0000';

  const displaySymbol = tokenInfo?.symbol || nativeBalance?.symbol || 'ETH';

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-text-secondary'>Wallet</span>
        <ConnectButton showBalance={false} />
      </div>

      {isConnected && address && (
        <div className='px-4 py-3 bg-background/50 border border-border/50 rounded-xl'>
          <div className='flex flex-col gap-1'>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-text-tertiary'>Address</span>
              <span className='text-xs font-mono text-text-secondary'>{truncateAddress(address)}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-text-tertiary'>Balance</span>
              <span className='text-sm font-medium text-text-primary'>
                {displayBalance} {displaySymbol}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

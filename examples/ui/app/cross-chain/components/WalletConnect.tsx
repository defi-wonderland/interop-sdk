'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletConnect() {
  return (
    <div className='flex items-center justify-between'>
      <span className='text-sm font-medium text-text-secondary'>Wallet</span>
      <ConnectButton showBalance={false} />
    </div>
  );
}

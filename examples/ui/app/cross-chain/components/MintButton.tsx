'use client';

import { useState, useCallback } from 'react';
import { parseUnits, type Address } from 'viem';
import { useAccount } from 'wagmi';
import { executeMint } from '../services/mint';
import { MINT_STATUS, type MintState } from '../types/mint';
import { SpinnerIcon } from './icons';

interface MintButtonProps {
  chainId: number;
  tokenAddress: Address;
  tokenSymbol: string;
  tokenDecimals: number;
  disabled?: boolean;
  onSuccess?: () => void;
}

export function MintButton({
  chainId,
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  disabled = false,
  onSuccess,
}: MintButtonProps) {
  const { address } = useAccount();
  const [mintState, setMintState] = useState<MintState>({
    status: MINT_STATUS.IDLE,
    txHash: null,
    error: null,
  });

  const isPending = mintState.status === MINT_STATUS.PENDING;
  const isConfirming = mintState.status === MINT_STATUS.CONFIRMING;
  const isSuccess = mintState.status === MINT_STATUS.SUCCESS;
  const isBusy = isPending || isConfirming;

  const handleMint = useCallback(async () => {
    if (!address) return;

    setMintState({ status: MINT_STATUS.PENDING, txHash: null, error: null });

    const result = await executeMint({
      walletAddress: address,
      tokenAddress,
      amount: parseUnits('100', tokenDecimals),
      chainId,
    });

    if (result.success) {
      setMintState({ status: MINT_STATUS.SUCCESS, txHash: result.txHash, error: null });
      setTimeout(() => {
        setMintState({ status: MINT_STATUS.IDLE, txHash: null, error: null });
        onSuccess?.();
      }, 2000);
    } else {
      setMintState({ status: MINT_STATUS.ERROR, txHash: null, error: result.error });
      setTimeout(() => {
        setMintState({ status: MINT_STATUS.IDLE, txHash: null, error: null });
      }, 3000);
    }
  }, [address, tokenAddress, tokenDecimals, chainId, onSuccess]);

  const getButtonContent = () => {
    if (isPending) {
      return (
        <>
          <SpinnerIcon className='w-3 h-3' />
          Confirm...
        </>
      );
    }
    if (isConfirming) {
      return (
        <>
          <SpinnerIcon className='w-3 h-3' />
          Minting...
        </>
      );
    }
    if (isSuccess) {
      return (
        <>
          <span className='text-green-400'>✓</span>
          Minted!
        </>
      );
    }
    if (mintState.error) {
      return <span className='text-red-400'>Error</span>;
    }
    return `Mint 100 ${tokenSymbol}`;
  };

  return (
    <button
      type='button'
      onClick={handleMint}
      disabled={disabled || isBusy || !address}
      className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
        disabled || isBusy || !address
          ? 'bg-surface-secondary/50 text-text-tertiary cursor-not-allowed'
          : 'bg-accent/20 text-accent hover:bg-accent/30 cursor-pointer'
      }`}
    >
      {getButtonContent()}
    </button>
  );
}

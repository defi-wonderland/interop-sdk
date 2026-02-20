'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { isNativeAddress } from '@wonderland/interop-cross-chain';
import { formatUnits, parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import { useChainConfig, useTokenConfig } from '../hooks/useNetworkConfig';
import { useRouteSelection } from '../hooks/useRouteSelection';
import { useBalanceStore, type TokenBalance } from '../stores/balanceStore';
import { isValidAmount, sanitizeAmountInput } from '../utils/amountValidation';
import { TokenSelect } from './TokenSelect';
import { WalletConnect } from './WalletConnect';

interface SwapFormProps {
  onSubmit: (params: {
    sender: string;
    recipient: string;
    inputChainId: number;
    outputChainId: number;
    inputTokenAddress: string;
    outputTokenAddress: string;
    inputAmount: string;
    inputAmountRaw: bigint;
  }) => void;
  onInputChange?: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
}

export function SwapForm({ onSubmit, onInputChange, isLoading = false, isDisabled = false }: SwapFormProps) {
  const { address: connectedAddress, isConnected } = useAccount();
  const chainConfig = useChainConfig();
  const tokenConfig = useTokenConfig();

  const {
    inputChainId,
    outputChainId,
    inputToken: inputTokenAddress,
    outputToken: outputTokenAddress,
    inputTokens,
    outputTokens,
    setInputChain,
    setOutputChain,
    setInputToken,
    setOutputToken,
  } = useRouteSelection(chainConfig.DEFAULT_INPUT_CHAIN_ID, chainConfig.DEFAULT_OUTPUT_CHAIN_ID);

  const [recipient, setRecipient] = useState('');
  const hasAutoFilledRef = useRef(false);
  const [inputAmount, setInputAmount] = useState('');

  const inputChains = useMemo(
    () => chainConfig.SUPPORTED_CHAINS.filter((c) => c.id !== outputChainId),
    [chainConfig.SUPPORTED_CHAINS, outputChainId],
  );
  const outputChains = useMemo(
    () => chainConfig.SUPPORTED_CHAINS.filter((c) => c.id !== inputChainId),
    [chainConfig.SUPPORTED_CHAINS, inputChainId],
  );

  const { balances: allBalances } = useBalanceStore();
  const balances: Record<string, TokenBalance> = allBalances[inputChainId] ?? {};
  const outputBalances: Record<string, TokenBalance> = allBalances[outputChainId] ?? {};

  const inputTokenInfo = inputTokenAddress ? tokenConfig.TOKEN_INFO[inputChainId]?.[inputTokenAddress] : null;
  const tokenBalance = balances[inputTokenAddress];

  const amountIsValid = useMemo(() => isValidAmount(inputAmount), [inputAmount]);

  const parsedInputAmount = useMemo(() => {
    if (!inputAmount || !amountIsValid) return 0n;
    try {
      const decimals = inputTokenInfo?.decimals || 18;
      return parseUnits(inputAmount, decimals);
    } catch {
      return 0n;
    }
  }, [inputAmount, inputTokenInfo?.decimals, amountIsValid]);

  const hasInsufficientBalance = Boolean(tokenBalance && inputAmount && parsedInputAmount > tokenBalance.raw);

  const handleMaxClick = () => {
    if (!tokenBalance) return;
    if (isNativeAddress(inputTokenAddress, 'eip155')) {
      // Reserve a small amount for gas fees
      const GAS_BUFFER = parseUnits('0.00005', 18);
      const max = tokenBalance.raw > GAS_BUFFER ? tokenBalance.raw - GAS_BUFFER : 0n;
      setInputAmount(formatUnits(max, 18));
    } else {
      setInputAmount(tokenBalance.formatted);
    }
  };

  useEffect(() => {
    if (isConnected && connectedAddress && !hasAutoFilledRef.current) {
      setRecipient(connectedAddress);
      hasAutoFilledRef.current = true;
    }
    if (!isConnected) {
      hasAutoFilledRef.current = false;
    }
  }, [isConnected, connectedAddress]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectedAddress || !inputTokenAddress || !outputTokenAddress || !amountIsValid) {
      return;
    }
    const finalRecipient = recipient.trim() || connectedAddress;
    const decimals = inputTokenInfo?.decimals || 18;
    const inputAmountRaw = parseUnits(inputAmount, decimals);

    onSubmit({
      sender: connectedAddress,
      recipient: finalRecipient,
      inputChainId,
      outputChainId,
      inputTokenAddress,
      outputTokenAddress,
      inputAmount,
      inputAmountRaw,
    });
  };

  const handleInputChainChange = (chainId: number) => {
    setInputChain(chainId);
    onInputChange?.();
  };

  const handleOutputChainChange = (chainId: number) => {
    setOutputChain(chainId);
    onInputChange?.();
  };

  const handleInputTokenChange = (address: string) => {
    setInputToken(address);
    onInputChange?.();
  };

  const handleOutputTokenChange = (address: string) => {
    setOutputToken(address);
    onInputChange?.();
  };

  const canSubmit =
    isConnected &&
    connectedAddress &&
    inputTokenAddress &&
    outputTokenAddress &&
    amountIsValid &&
    parsedInputAmount > 0n &&
    !isLoading &&
    !isDisabled &&
    !hasInsufficientBalance;

  const getButtonText = () => {
    if (!isConnected) return 'Connect Wallet';
    if (isLoading) return 'Fetching Quotes...';
    if (hasInsufficientBalance) return 'Insufficient Balance';
    return 'Get Quotes';
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='relative backdrop-blur-xl bg-surface/80 rounded-3xl border border-border/50 p-6 shadow-2xl'
    >
      <div className='absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-3xl pointer-events-none' />

      <div className='relative flex flex-col gap-6'>
        <WalletConnect />

        <div>
          <label htmlFor='recipient-address' className='text-sm font-medium text-text-secondary mb-2 block'>
            Recipient Address
          </label>
          <input
            id='recipient-address'
            type='text'
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder='0x...'
            autoComplete='off'
            data-1p-ignore
            disabled={isDisabled}
            className={`w-full px-4 py-3 bg-background/50 border border-border/50 rounded-xl font-mono text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <p className='text-xs text-text-tertiary mt-1'>Leave empty to use your wallet address.</p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='flex flex-col gap-3'>
            <label htmlFor='input-chain-select' className='text-sm font-medium text-text-secondary'>
              From
            </label>
            <select
              id='input-chain-select'
              value={inputChainId}
              onChange={(e) => handleInputChainChange(Number(e.target.value))}
              disabled={isDisabled}
              className={`w-full px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {inputChains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <TokenSelect
              tokens={inputTokens}
              tokenInfo={tokenConfig.TOKEN_INFO[inputChainId] || {}}
              balances={balances}
              value={inputTokenAddress}
              onChange={handleInputTokenChange}
              disabled={isDisabled}
              dataTestId='input-token-select'
            />
          </div>

          <div className='flex flex-col gap-3'>
            <label htmlFor='output-chain-select' className='text-sm font-medium text-text-secondary'>
              To
            </label>
            <select
              id='output-chain-select'
              value={outputChainId}
              onChange={(e) => handleOutputChainChange(Number(e.target.value))}
              disabled={isDisabled}
              className={`w-full px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {outputChains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <TokenSelect
              tokens={outputTokens}
              tokenInfo={tokenConfig.TOKEN_INFO[outputChainId] || {}}
              balances={outputBalances}
              value={outputTokenAddress}
              onChange={handleOutputTokenChange}
              disabled={isDisabled}
              dataTestId='output-token-select'
            />
          </div>
        </div>

        <div>
          <div className='flex items-center justify-between mb-2'>
            <label htmlFor='amount-input' className='text-sm font-medium text-text-secondary'>
              Amount
            </label>
            {tokenBalance && (
              <button
                type='button'
                onClick={handleMaxClick}
                disabled={isDisabled}
                className='text-xs text-accent hover:text-accent-hover font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Max: {tokenBalance.formatted}
              </button>
            )}
          </div>
          <input
            id='amount-input'
            type='text'
            value={inputAmount}
            onChange={(e) => setInputAmount(sanitizeAmountInput(e.target.value, inputAmount))}
            placeholder='0.0'
            autoComplete='off'
            disabled={isDisabled}
            className={`w-full px-4 py-3 bg-background/50 border border-border/50 rounded-xl font-mono text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>

        <button
          type='submit'
          disabled={!canSubmit}
          className={`w-full px-6 py-3 rounded-xl font-medium transition-all ${
            canSubmit
              ? 'bg-accent text-white hover:bg-accent-hover cursor-pointer'
              : 'bg-surface-secondary text-text-tertiary cursor-not-allowed opacity-50'
          }`}
        >
          {getButtonText()}
        </button>
      </div>
    </form>
  );
}

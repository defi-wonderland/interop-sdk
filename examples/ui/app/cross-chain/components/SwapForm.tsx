'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import { useChainConfig, useTokenConfig } from '../hooks/useNetworkConfig';
import { useBalanceStore } from '../stores/balanceStore';
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
  isLoading?: boolean;
  isDisabled?: boolean;
}

export function SwapForm({ onSubmit, isLoading = false, isDisabled = false }: SwapFormProps) {
  const { address: connectedAddress, isConnected } = useAccount();
  const chainConfig = useChainConfig();
  const tokenConfig = useTokenConfig();

  const getDefaultToken = (chainId: number): string => {
    const tokens = tokenConfig.SUPPORTED_TOKEN_BY_CHAIN_ID[chainId] || [];
    return tokens[0] || '';
  };

  const [recipient, setRecipient] = useState('');
  const hasAutoFilledRef = useRef(false);
  const [inputChainId, setInputChainId] = useState(chainConfig.DEFAULT_INPUT_CHAIN_ID);
  const [outputChainId, setOutputChainId] = useState(chainConfig.DEFAULT_OUTPUT_CHAIN_ID);
  const [inputTokenAddress, setInputTokenAddress] = useState(() => getDefaultToken(chainConfig.DEFAULT_INPUT_CHAIN_ID));
  const [outputTokenAddress, setOutputTokenAddress] = useState(() =>
    getDefaultToken(chainConfig.DEFAULT_OUTPUT_CHAIN_ID),
  );
  const [inputAmount, setInputAmount] = useState('');

  const inputTokens = useMemo(
    () => tokenConfig.SUPPORTED_TOKEN_BY_CHAIN_ID[inputChainId] || [],
    [inputChainId, tokenConfig],
  );
  const outputTokens = useMemo(
    () => tokenConfig.SUPPORTED_TOKEN_BY_CHAIN_ID[outputChainId] || [],
    [outputChainId, tokenConfig],
  );

  const balances = useBalanceStore((state) => state.balances[inputChainId]) ?? {};
  const outputBalances = useBalanceStore((state) => state.balances[outputChainId]) ?? {};

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
    const tokenInfo = tokenConfig.TOKEN_INFO[inputChainId]?.[inputTokenAddress];
    const decimals = tokenInfo?.decimals || 18;
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
    setInputChainId(chainId);
    const tokens = tokenConfig.SUPPORTED_TOKEN_BY_CHAIN_ID[chainId] || [];
    if (tokens.length > 0) {
      setInputTokenAddress(tokens[0]);
    }
  };

  const handleOutputChainChange = (chainId: number) => {
    setOutputChainId(chainId);
    const tokens = tokenConfig.SUPPORTED_TOKEN_BY_CHAIN_ID[chainId] || [];
    if (tokens.length > 0) {
      setOutputTokenAddress(tokens[0]);
    }
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
            placeholder='0x... or alice.eth@chain'
            autoComplete='off'
            data-1p-ignore
            disabled={isDisabled}
            className={`w-full px-4 py-3 bg-background/50 border border-border/50 rounded-xl font-mono text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <p className='text-xs text-text-tertiary mt-1'>
            Supports interoperable addresses (e.g., alice.eth@base-sepolia). Leave empty to use your wallet address.
          </p>
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
              {chainConfig.SUPPORTED_CHAINS.map((c) => (
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
              onChange={setInputTokenAddress}
              disabled={isDisabled}
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
              {chainConfig.SUPPORTED_CHAINS.map((c) => (
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
              onChange={setOutputTokenAddress}
              disabled={isDisabled}
            />
          </div>
        </div>

        <div>
          <label htmlFor='amount-input' className='text-sm font-medium text-text-secondary mb-2 block'>
            Amount
          </label>
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

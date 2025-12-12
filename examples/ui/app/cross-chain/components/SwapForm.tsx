'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import {
  SUPPORTED_CHAINS,
  DEFAULT_INPUT_CHAIN_ID,
  DEFAULT_OUTPUT_CHAIN_ID,
  SUPPORTED_TOKEN_BY_CHAIN_ID,
  TOKEN_INFO,
} from '../constants';
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
  isDisabled?: boolean; // Disable form during transaction execution
}

export function SwapForm({ onSubmit, isLoading = false, isDisabled = false }: SwapFormProps) {
  const { address: connectedAddress, isConnected } = useAccount();
  const [recipient, setRecipient] = useState('');
  const [inputChainId, setInputChainId] = useState<number>(DEFAULT_INPUT_CHAIN_ID);
  const [outputChainId, setOutputChainId] = useState<number>(DEFAULT_OUTPUT_CHAIN_ID);
  const [inputTokenAddress, setInputTokenAddress] = useState<string>('');
  const [outputTokenAddress, setOutputTokenAddress] = useState<string>('');
  const [inputAmount, setInputAmount] = useState('');

  const inputTokens = useMemo(() => SUPPORTED_TOKEN_BY_CHAIN_ID[inputChainId] || [], [inputChainId]);
  const outputTokens = useMemo(() => SUPPORTED_TOKEN_BY_CHAIN_ID[outputChainId] || [], [outputChainId]);

  useEffect(() => {
    if (isConnected && connectedAddress && !recipient) {
      setRecipient(connectedAddress);
    }
  }, [isConnected, connectedAddress, recipient]);

  useEffect(() => {
    if (inputTokens.length > 0 && (!inputTokenAddress || !inputTokens.includes(inputTokenAddress))) {
      setInputTokenAddress(inputTokens[0]);
    }
  }, [inputChainId, inputTokens, inputTokenAddress]);

  useEffect(() => {
    if (outputTokens.length > 0 && (!outputTokenAddress || !outputTokens.includes(outputTokenAddress))) {
      setOutputTokenAddress(outputTokens[0]);
    }
  }, [outputChainId, outputTokens, outputTokenAddress]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectedAddress || !inputTokenAddress || !outputTokenAddress || !inputAmount) {
      return;
    }
    const finalRecipient = recipient.trim() || connectedAddress;
    const tokenInfo = TOKEN_INFO[inputTokenAddress];
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
    const tokens = SUPPORTED_TOKEN_BY_CHAIN_ID[chainId] || [];
    if (tokens.length > 0) {
      setInputTokenAddress(tokens[0]);
    }
  };

  const handleOutputChainChange = (chainId: number) => {
    setOutputChainId(chainId);
    const tokens = SUPPORTED_TOKEN_BY_CHAIN_ID[chainId] || [];
    if (tokens.length > 0) {
      setOutputTokenAddress(tokens[0]);
    }
  };

  const canSubmit =
    isConnected &&
    connectedAddress &&
    inputTokenAddress &&
    outputTokenAddress &&
    inputAmount &&
    !isLoading &&
    !isDisabled;

  return (
    <form
      onSubmit={handleSubmit}
      className='relative backdrop-blur-xl bg-surface/80 rounded-3xl border border-border/50 p-6 shadow-2xl'
    >
      <div className='absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-3xl pointer-events-none' />

      <div className='relative flex flex-col gap-6'>
        <WalletConnect selectedTokenAddress={inputTokenAddress} />

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
              {SUPPORTED_CHAINS.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
            <select
              id='input-token-select'
              value={inputTokenAddress}
              onChange={(e) => setInputTokenAddress(e.target.value)}
              disabled={isDisabled}
              className={`w-full px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {inputTokens.map((token) => {
                const info = TOKEN_INFO[token];
                return (
                  <option key={token} value={token}>
                    {info?.symbol || token.slice(0, 8)}...
                  </option>
                );
              })}
            </select>
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
              {SUPPORTED_CHAINS.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
            <select
              id='output-token-select'
              value={outputTokenAddress}
              onChange={(e) => setOutputTokenAddress(e.target.value)}
              disabled={isDisabled}
              className={`w-full px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {outputTokens.map((token) => {
                const info = TOKEN_INFO[token];
                return (
                  <option key={token} value={token}>
                    {info?.symbol || token.slice(0, 8)}...
                  </option>
                );
              })}
            </select>
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
            onChange={(e) => setInputAmount(e.target.value)}
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
          {!isConnected ? 'Connect Wallet' : isLoading ? 'Fetching Quotes...' : 'Get Quotes'}
        </button>
      </div>
    </form>
  );
}

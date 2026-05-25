'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { isNativeAddress } from '@wonderland/interop-cross-chain';
import { formatUnits, parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import { Select } from '../../components';
import { MINT_AMOUNT, useMintToken } from '../hooks/useMintToken';
import { useChainConfig, useTokenConfig } from '../hooks/useNetworkConfig';
import { useRouteSelection } from '../hooks/useRouteSelection';
import { BUILD_QUOTE_PROVIDERS } from '../services/sdk';
import { useBalanceStore, type TokenBalance } from '../stores/balanceStore';
import { useCrossChainStore, type SwapFormMode } from '../stores/crossChainStore';
import {
  exceedsDemoLimit as checkDemoLimit,
  formatFee,
  isValidAmount,
  normalizeAmount,
  sanitizeAmountInput,
} from '../utils/amountValidation';
import { GaslessApprovalNotice } from './GaslessApprovalNotice';
import { SubmissionModeSwitch } from './SubmissionModeSwitch';
import { TabSwitch } from './TabSwitch';
import { TokenSelect } from './TokenSelect';
import { WalletConnect } from './WalletConnect';
import { SwapIcon } from './icons';

export type { SwapFormMode } from '../stores/crossChainStore';

const MODE_OPTIONS: { value: SwapFormMode; label: string }[] = [
  { value: 'getQuotes', label: 'Get Quotes' },
  { value: 'buildQuote', label: 'Build Quote' },
];

interface SwapFormSubmitParams {
  sender: string;
  recipient: string;
  inputChainId: number;
  outputChainId: number;
  inputTokenAddress: string;
  outputTokenAddress: string;
  inputAmount: string;
  inputAmountRaw: bigint;
  mode: SwapFormMode;
  outputAmount?: string;
  fillDeadlineSecs?: number;
}

interface SwapFormProps {
  onSubmit: (params: SwapFormSubmitParams) => void;
  onInputChange?: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
}

const DEADLINE_OPTIONS = [
  { label: '10 min', value: 600 },
  { label: '30 min', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '4 hours', value: 14400 },
];

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
    reverseDirection,
  } = useRouteSelection(chainConfig.DEFAULT_INPUT_CHAIN_ID, chainConfig.DEFAULT_OUTPUT_CHAIN_ID);

  const [recipient, setRecipient] = useState('');
  const hasAutoFilledRef = useRef(false);
  const [inputAmount, setInputAmount] = useState('');
  const mode = useCrossChainStore((s) => s.mode);
  const setMode = useCrossChainStore((s) => s.setMode);
  const submissionMode = useCrossChainStore((s) => s.submissionMode);
  const buildQuoteProviderId = useCrossChainStore((s) => s.buildQuoteProviderId);
  const setBuildQuoteProviderId = useCrossChainStore((s) => s.setBuildQuoteProviderId);
  const [outputAmount, setOutputAmount] = useState('');
  const [fillDeadlineSecs, setFillDeadlineSecs] = useState(DEADLINE_OPTIONS[0].value);

  const inputChains = useMemo(
    () => chainConfig.SUPPORTED_CHAINS.filter((c) => c.id !== outputChainId),
    [chainConfig.SUPPORTED_CHAINS, outputChainId],
  );
  const outputChains = useMemo(
    () => chainConfig.SUPPORTED_CHAINS.filter((c) => c.id !== inputChainId),
    [chainConfig.SUPPORTED_CHAINS, inputChainId],
  );

  const balances: Record<string, TokenBalance> = useBalanceStore((state) => state.balances[inputChainId]) ?? {};
  const outputBalances: Record<string, TokenBalance> = useBalanceStore((state) => state.balances[outputChainId]) ?? {};

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

  const exceedsLimit = checkDemoLimit(inputAmount, inputTokenInfo?.symbol);

  const outputTokenInfo = outputTokenAddress ? tokenConfig.TOKEN_INFO[outputChainId]?.[outputTokenAddress] : null;
  const isSameToken = Boolean(inputTokenInfo && outputTokenInfo && inputTokenInfo.symbol === outputTokenInfo.symbol);

  const feeDisplay = useMemo(() => {
    if (mode !== 'buildQuote' || !isSameToken) return null;
    if (!isValidAmount(inputAmount) || !isValidAmount(outputAmount)) return null;
    return formatFee(inputAmount, outputAmount);
  }, [mode, inputAmount, outputAmount, isSameToken]);

  const noFeeWarning = useMemo(() => {
    if (mode !== 'buildQuote' || !isSameToken) return false;
    if (!isValidAmount(inputAmount) || !isValidAmount(outputAmount)) return false;
    return parseFloat(normalizeAmount(outputAmount)) >= parseFloat(normalizeAmount(inputAmount));
  }, [mode, inputAmount, outputAmount, isSameToken]);

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

  const outputAmountIsValid = useMemo(() => isValidAmount(outputAmount), [outputAmount]);

  const parsedOutputAmount = useMemo(() => {
    if (!outputAmount || !outputAmountIsValid) return 0n;
    try {
      const outputInfo = outputTokenAddress ? tokenConfig.TOKEN_INFO[outputChainId]?.[outputTokenAddress] : null;
      const decimals = outputInfo?.decimals || 18;
      return parseUnits(outputAmount, decimals);
    } catch {
      return 0n;
    }
  }, [outputAmount, outputAmountIsValid, outputTokenAddress, outputChainId, tokenConfig.TOKEN_INFO]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !connectedAddress ||
      !inputTokenAddress ||
      !outputTokenAddress ||
      !amountIsValid ||
      parsedInputAmount <= 0n ||
      exceedsLimit
    ) {
      return;
    }
    if (mode === 'buildQuote' && (!outputAmountIsValid || parsedOutputAmount <= 0n)) {
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
      mode,
      ...(mode === 'buildQuote' && {
        outputAmount,
        fillDeadlineSecs,
      }),
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

  const handleReverseDirection = () => {
    reverseDirection();
    onInputChange?.();
  };

  const handleInputTokenChange = (address: string) => {
    setInputToken(address);
    onInputChange?.();
  };

  const handleModeChange = (newMode: SwapFormMode) => {
    setMode(newMode);
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
    !hasInsufficientBalance &&
    !exceedsLimit &&
    !noFeeWarning &&
    (mode === 'getQuotes' || (outputAmountIsValid && parsedOutputAmount > 0n));

  const isMintable = inputTokenInfo?.providers?.includes('oif') ?? false;
  const { mint, isLoading: isMinting } = useMintToken(inputChainId, inputTokenAddress, inputTokenInfo?.decimals ?? 6);
  const showMintButton = isMintable && isConnected;
  const tokenSymbol = inputTokenInfo?.symbol ?? '';
  const mintLabel = isMinting ? 'Minting...' : `Mint ${MINT_AMOUNT} ${tokenSymbol}`;

  const getButtonText = () => {
    if (!isConnected) return 'Connect Wallet';
    if (isLoading) return mode === 'buildQuote' ? 'Building Quote...' : 'Fetching Quotes...';
    if (exceedsLimit) return 'Amount too large for demo';
    if (hasInsufficientBalance) return 'Insufficient Balance';
    return mode === 'buildQuote' ? 'Build Quote' : 'Get Quotes';
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='relative backdrop-blur-xl bg-surface/80 rounded-3xl border border-border/50 p-6 shadow-2xl'
    >
      <div className='absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-3xl pointer-events-none' />

      <div className='relative flex flex-col gap-6'>
        <WalletConnect />

        <TabSwitch
          options={MODE_OPTIONS}
          value={mode}
          onChange={handleModeChange}
          ariaLabel='Quote mode selection'
          disabled={isDisabled}
        />

        {mode === 'getQuotes' && (
          <div className='flex flex-col'>
            <SubmissionModeSwitch disabled={isDisabled} />
            <div
              aria-hidden={submissionMode !== 'gasless'}
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                submissionMode === 'gasless' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className='overflow-hidden'>
                <div className='pt-2'>
                  <GaslessApprovalNotice />
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'buildQuote' && (
          <div>
            <label htmlFor='buildQuoteProvider' className='text-sm font-medium text-text-secondary mb-2 block'>
              Provider
            </label>
            <Select
              id='buildQuoteProvider'
              value={buildQuoteProviderId}
              options={BUILD_QUOTE_PROVIDERS.map((p) => ({ value: p.providerId, label: p.displayName }))}
              onChange={(value) => {
                setBuildQuoteProviderId(value);
                onInputChange?.();
              }}
              disabled={isDisabled}
            />
          </div>
        )}

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

        <div className='grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-3'>
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

          <div className='flex items-center justify-center'>
            <button
              type='button'
              onClick={handleReverseDirection}
              disabled={isDisabled}
              aria-label='Reverse direction'
              title='Reverse direction'
              data-testid='reverse-direction-button'
              className={`p-2 rounded-lg border border-border/50 bg-background/50 text-text-secondary hover:text-accent hover:border-accent/60 transition-colors focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <SwapIcon className='w-4 h-4' />
            </button>
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
              emptyMessage='No route available'
            />
          </div>
        </div>

        <div className={mode === 'buildQuote' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
          <div>
            <div className='flex items-center justify-between mb-2'>
              <div className='flex items-center gap-3'>
                <label htmlFor='amount-input' className='text-sm font-medium text-text-secondary'>
                  {mode === 'buildQuote' ? 'You send' : 'Amount'}
                </label>
                {showMintButton && (
                  <button
                    type='button'
                    onClick={mint}
                    disabled={isMinting || isDisabled}
                    data-testid='mint-button'
                    className='text-xs text-accent hover:text-accent-hover font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {mintLabel}
                  </button>
                )}
              </div>
              {tokenBalance && (
                <button
                  type='button'
                  onClick={handleMaxClick}
                  disabled={isDisabled}
                  data-testid='max-balance-button'
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

          {mode === 'buildQuote' && (
            <div>
              <label htmlFor='output-amount-input' className='text-sm font-medium text-text-secondary mb-2 block'>
                You receive
              </label>
              <input
                id='output-amount-input'
                type='text'
                value={outputAmount}
                onChange={(e) => setOutputAmount(sanitizeAmountInput(e.target.value, outputAmount))}
                placeholder='0.0'
                autoComplete='off'
                disabled={isDisabled}
                className={`w-full px-4 py-3 bg-background/50 border border-border/50 rounded-xl font-mono text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {noFeeWarning && (
                <p data-testid='fee-warning' className='text-xs text-error mt-1'>
                  Output must be less than input to cover the solver fee
                </p>
              )}
              {!noFeeWarning && feeDisplay && (
                <p data-testid='fee-display' className='text-xs text-accent mt-1'>
                  {feeDisplay}
                </p>
              )}
              {!noFeeWarning && !feeDisplay && (
                <p data-testid='fee-hint' className='text-xs text-text-tertiary mt-1'>
                  Difference is the fee
                </p>
              )}
            </div>
          )}
        </div>

        {mode === 'buildQuote' && (
          <fieldset>
            <legend className='text-sm font-medium text-text-secondary mb-2'>Fill Deadline</legend>
            <div className='flex gap-2'>
              {DEADLINE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/50 has-[:focus-visible]:ring-offset-1 ${
                    fillDeadlineSecs === opt.value
                      ? 'bg-accent text-white'
                      : 'bg-background/50 border border-border/50 text-text-secondary hover:text-text-primary hover:border-border-focus/60'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type='radio'
                    name='fillDeadline'
                    value={opt.value}
                    checked={fillDeadlineSecs === opt.value}
                    onChange={() => setFillDeadlineSecs(opt.value)}
                    disabled={isDisabled}
                    className='sr-only peer'
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <button
          type='submit'
          data-testid='submit-button'
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

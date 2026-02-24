'use client';

import { useState, useRef, useEffect } from 'react';
import { formatTokenBalance, getDisplaySymbol, sortTokensByBalance } from '../utils/formatting';
import { ChevronDownIcon } from './icons';
import type { TokenBalance } from '../stores/balanceStore';
import type { UITokenInfo } from '../types/assets';

interface TokenSelectProps {
  tokens: readonly string[];
  tokenInfo: Record<string, UITokenInfo>;
  balances: Record<string, TokenBalance>;
  value: string;
  onChange: (address: string) => void;
  disabled?: boolean;
  dataTestId?: string;
  emptyMessage?: string;
}

interface TokenOptionProps {
  address: string;
  info: UITokenInfo | undefined;
  balance: TokenBalance | undefined;
  isSelected: boolean;
  onSelect: (address: string) => void;
}

function TokenOption({ address, info, balance, isSelected, onSelect }: TokenOptionProps) {
  return (
    <button
      type='button'
      onClick={() => onSelect(address)}
      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-background/50 transition-colors ${isSelected ? 'bg-accent/10 text-accent' : ''}`}
    >
      <span className='font-medium'>{getDisplaySymbol(info, address)}</span>
      <span className='text-text-tertiary text-xs tabular-nums'>{formatTokenBalance(balance)}</span>
    </button>
  );
}

export function TokenSelect({
  tokens,
  tokenInfo,
  balances,
  value,
  onChange,
  disabled,
  dataTestId,
  emptyMessage = 'No tokens available',
}: TokenSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedTokens = sortTokensByBalance(tokens, balances);
  const isEmpty = sortedTokens.length === 0;
  const isDisabled = disabled || isEmpty;
  const label = isEmpty ? emptyMessage : getDisplaySymbol(tokenInfo[value], value);

  return (
    <div ref={containerRef} className='relative'>
      <button
        type='button'
        onClick={() => !isDisabled && setIsOpen((prev) => !prev)}
        disabled={isDisabled}
        data-testid={dataTestId}
        className={`w-full flex items-center justify-between px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-sm text-left focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
      >
        <span className={isEmpty ? 'text-text-tertiary' : 'font-medium'}>{label}</span>
        <div className='flex items-center gap-2'>
          {!isEmpty && (
            <span className='text-text-tertiary text-xs tabular-nums'>{formatTokenBalance(balances[value])}</span>
          )}
          <ChevronDownIcon
            className={`w-4 h-4 text-text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div
          data-testid={dataTestId ? `${dataTestId}-listbox` : undefined}
          className='absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-surface border border-border/50 rounded-xl shadow-xl'
        >
          {sortedTokens.map((token) => (
            <TokenOption
              key={token}
              address={token}
              info={tokenInfo[token]}
              balance={balances[token]}
              isSelected={token === value}
              onSelect={(addr) => {
                onChange(addr);
                setIsOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

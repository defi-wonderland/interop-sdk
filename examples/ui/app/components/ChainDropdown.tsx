'use client';

import { useState, useMemo } from 'react';
import { cn } from '../utils/cn';
import { DropdownContent } from './DropdownContent';
import type { Chain } from '../lib/getChains';

interface ChainDropdownProps {
  chains: Chain[];
  value: string;
  onChange: (shortName: string) => void;
  id?: string;
  className?: string;
}

export function ChainDropdown({ chains, value, onChange, id, className }: ChainDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredChains = useMemo(() => {
    if (!value.trim()) return chains;
    const search = value.toLowerCase();
    return chains.filter(
      (chain) =>
        chain.name.toLowerCase().includes(search) ||
        chain.shortName.toLowerCase().includes(search) ||
        chain.chainId.toString().includes(value),
    );
  }, [value, chains]);

  const handleSelect = (chain: Chain) => {
    onChange(chain.shortName);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  return (
    <div className={cn('relative', className)}>
      <input
        id={id}
        type='text'
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen((prevOpen) => !prevOpen)}
        onBlur={() => setIsOpen(false)}
        placeholder='Search chain name...'
        autoComplete='off'
        className='w-full px-4 py-3 bg-background/50 border border-border/50 rounded-xl font-mono text-sm focus:border-accent focus:ring-2 focus:ring-accent/20'
      />
      {isOpen && (
        <div className='absolute z-50 w-full mt-1 bg-background border border-border/50 rounded-xl shadow-lg max-h-60 overflow-auto'>
          <DropdownContent filteredChains={filteredChains} onSelect={handleSelect} />
        </div>
      )}
    </div>
  );
}

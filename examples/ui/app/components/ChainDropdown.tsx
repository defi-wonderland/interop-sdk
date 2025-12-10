'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync inputValue with value prop when value changes externally
  useEffect(() => {
    if (value !== inputValue && document.activeElement !== inputRef.current) {
      setInputValue(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const filteredChains = useMemo(() => {
    if (!inputValue.trim()) return chains;
    const search = inputValue.toLowerCase();
    return chains.filter(
      (chain) =>
        chain.name.toLowerCase().includes(search) ||
        chain.shortName.toLowerCase().includes(search) ||
        chain.chainId.toString().includes(inputValue),
    );
  }, [inputValue, chains]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (chain: Chain) => {
    setInputValue(chain.shortName);
    onChange(chain.shortName);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Delay to allow click events on dropdown items to fire first
    setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className || ''}`}>
      <input
        ref={inputRef}
        id={id}
        type='text'
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={handleInputBlur}
        placeholder='Search chain name...'
        autoComplete='off'
        className='w-full px-4 py-3 bg-background/50 backdrop-blur border border-border/50 rounded-xl font-mono text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all'
      />
      {isOpen && (
        <div className='absolute z-50 w-full mt-1 bg-background border border-border/50 rounded-xl shadow-lg max-h-60 overflow-auto'>
          <DropdownContent filteredChains={filteredChains} onSelect={handleSelect} />
        </div>
      )}
    </div>
  );
}

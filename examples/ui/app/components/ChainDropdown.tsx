'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

interface Chain {
  name: string;
  chainId: number;
  shortName: string;
}

interface ChainDropdownProps {
  value: string;
  onChange: (shortName: string) => void;
  id?: string;
  className?: string;
}

export function ChainDropdown({ value, onChange, id, className }: ChainDropdownProps) {
  const [chains, setChains] = useState<Chain[]>([]);
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const response = await fetch('https://chainid.network/chains_mini.json');
        const data: Chain[] = await response.json();
        setChains(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch chains:', error);
        setIsLoading(false);
      }
    };

    fetchChains();
  }, []);

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
          {isLoading ? (
            <div className='px-4 py-3 text-sm text-text-secondary'>Loading chains...</div>
          ) : filteredChains.length === 0 ? (
            <div className='px-4 py-3 text-sm text-text-secondary'>No chains found</div>
          ) : (
            filteredChains.slice(0, 50).map((chain) => (
              <button
                key={chain.chainId}
                type='button'
                onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                onClick={() => handleSelect(chain)}
                className='w-full text-left px-4 py-2 hover:bg-accent-light/20 transition-colors cursor-pointer'
              >
                <div className='font-medium text-sm'>{chain.name}</div>
                <div className='text-xs text-text-secondary'>
                  {chain.shortName} • Chain ID: {chain.chainId}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

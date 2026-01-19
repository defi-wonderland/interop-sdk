'use client';

import { useMemo } from 'react';
import { Select, type SelectOption } from './Select';
import type { Chain } from '../lib/getChains';

interface ChainDropdownProps {
  chains: Chain[];
  value: string;
  onChange: (shortName: string) => void;
  id?: string;
  className?: string;
}

export function ChainDropdown({ chains, value, onChange, id, className }: ChainDropdownProps) {
  const options: SelectOption[] = useMemo(
    () =>
      chains.map((chain) => ({
        value: chain.shortName,
        label: chain.name,
        description: `${chain.shortName} • Chain ID: ${chain.chainId}`,
      })),
    [chains],
  );

  const selectedValue = useMemo(() => {
    // Find matching chain: try by shortName first, then by chainId
    let matchedChain = chains.find((chain) => chain.shortName === value);

    if (!matchedChain) {
      const numericChainId = Number(value);
      if (!isNaN(numericChainId)) {
        matchedChain = chains.find((chain) => chain.chainId === numericChainId);
      }
    }

    return matchedChain?.shortName || '';
  }, [chains, value]);

  return (
    <Select
      id={id}
      value={selectedValue}
      options={options}
      onChange={onChange}
      placeholder='Select chain...'
      searchPlaceholder='Search chain...'
      emptyMessage='No chains found'
      className={className}
    />
  );
}

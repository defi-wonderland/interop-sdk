'use client';

import { useCallback, useMemo } from 'react';
import { Select, type SelectOption } from './Select';
import { Tooltip } from './Tooltip';
import { ShieldCheckIcon } from './icons/Icons';
import type { RegistryChainWithStatus } from '../lib/registry-chains';

interface ChainDropdownProps {
  chains: RegistryChainWithStatus[];
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
        description: `${chain.shortName} • ${chain.chainType}:${chain.chainReference}`,
      })),
    [chains],
  );

  const selectedValue = useMemo(() => {
    const matchedChain = chains.find((chain) => chain.shortName === value);
    return matchedChain?.shortName || '';
  }, [chains, value]);

  const RegistryBadge = useCallback(
    ({ shortName, side = 'right' }: { shortName: string; side?: 'top' | 'right' | 'bottom' | 'left' }) => {
      const registered = chains.some((c) => c.shortName === shortName && c.isRegistered);
      if (!registered) return null;
      return (
        <Tooltip content='Registered in the on.eth on-chain registry' side={side}>
          <span className='text-accent'>
            <ShieldCheckIcon />
          </span>
        </Tooltip>
      );
    },
    [chains],
  );

  const renderOption = useCallback(
    (option: SelectOption) => (
      <>
        <div className='flex items-center gap-1.5'>
          <span className='font-medium text-sm'>{option.label}</span>
          <RegistryBadge shortName={option.value} />
        </div>
        {option.description && <div className='text-xs text-text-secondary'>{option.description}</div>}
      </>
    ),
    [RegistryBadge],
  );

  const renderSelected = useCallback(
    (option: SelectOption) => (
      <span className='flex items-center gap-1.5'>
        {option.label}
        <RegistryBadge shortName={option.value} side='bottom' />
      </span>
    ),
    [RegistryBadge],
  );

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
      renderOption={renderOption}
      renderSelected={renderSelected}
    />
  );
}

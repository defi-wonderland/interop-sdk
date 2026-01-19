'use client';

import { useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  id?: string;
  className?: string;
  emptyMessage?: string;
  renderOption?: (option: SelectOption) => ReactNode;
}

export function Select({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  id,
  className,
  emptyMessage = 'No results found',
  renderOption,
}: SelectProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearch('');
    }
  };

  const filteredOptions = options
    .filter((option) => {
      if (!search.trim()) return true;
      const searchLower = search.toLowerCase();
      return (
        option.label.toLowerCase().includes(searchLower) ||
        option.value.toLowerCase().includes(searchLower) ||
        option.description?.toLowerCase().includes(searchLower)
      );
    })
    .slice(0, 50);

  const emptyResults = filteredOptions.length === 0;

  const defaultRenderOption = (option: SelectOption) => (
    <>
      <div className='font-medium text-sm'>{option.label}</div>
      {option.description && <div className='text-xs text-text-secondary'>{option.description}</div>}
    </>
  );

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          id={id}
          type='button'
          className={cn(
            'w-full px-4 py-3 bg-background/50 border border-border/50 rounded-xl font-mono text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 text-left flex items-center justify-between',
            className,
          )}
        >
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
          <svg
            width='12'
            height='12'
            viewBox='0 0 12 12'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            className='ml-2'
          >
            <path d='M2 4L6 8L10 4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
          </svg>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className='bg-background border border-border/50 rounded-xl shadow-lg overflow-hidden z-50 w-[var(--radix-popover-trigger-width)]'
          sideOffset={4}
          align='start'
        >
          <div className='px-3 py-2 border-b border-border/50'>
            <input
              type='text'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className='w-full px-2 py-1 bg-background/50 border border-border/50 rounded font-mono text-sm focus:outline-none focus:border-accent'
            />
          </div>

          <div className='max-h-60 overflow-auto p-1'>
            {emptyResults && <div className='px-4 py-3 text-sm text-text-secondary'>{emptyMessage}</div>}
            {!emptyResults &&
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type='button'
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded cursor-pointer outline-none transition-colors',
                    'hover:bg-accent-light/20 focus:bg-accent-light/20',
                    option.value === value && 'bg-accent-light/20',
                  )}
                >
                  {renderOption ? renderOption(option) : defaultRenderOption(option)}
                </button>
              ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Chevron } from './Chevron';
import { Icon } from './Icon';
import { Label } from './Label';
import { cn } from '~/lib/cn';

export interface DropdownOption<T> {
  value: T;
  label: string;
  iconUrl: string;
}

interface DropdownProps<T extends string | number> {
  label: string;
  value: T;
  options: readonly DropdownOption<T>[];
  onChange: (value: T) => void;
  minWidthClass?: string;
}

export function Dropdown<T extends string | number>({
  label,
  value,
  options,
  onChange,
  minWidthClass = 'md:min-w-[7.5rem]',
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = options.find((option) => option.value === value);
  const selectedIndex = options.findIndex((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const targetIndex = selectedIndex >= 0 ? selectedIndex : 0;
    optionRefs.current[targetIndex]?.focus();
  }, [open, selectedIndex]);

  const closeAndReturnFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleSelect = (next: T) => {
    onChange(next);
    closeAndReturnFocus();
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const currentIndex = optionRefs.current.findIndex((node) => node === document.activeElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, options.length - 1);
      optionRefs.current[next]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const previous = currentIndex <= 0 ? options.length - 1 : currentIndex - 1;
      optionRefs.current[previous]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      optionRefs.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      optionRefs.current[options.length - 1]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeAndReturnFocus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={cn('relative flex flex-1 flex-col gap-1.5 md:flex-none', minWidthClass)}>
      <Label className='font-mono text-caption uppercase tracking-widest text-text-muted'>{label}</Label>
      <button
        ref={triggerRef}
        type='button'
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-label={`${label.toLowerCase()}: ${current?.label ?? 'none'}`}
        className='inline-flex cursor-pointer items-center gap-2 text-left transition-transform active:scale-95'
      >
        {current ? <Icon src={current.iconUrl} alt='' size='sm' /> : null}
        <Label className='font-sans text-lg font-medium tracking-tight text-text-primary md:text-xl'>
          {current?.label ?? '—'}
        </Label>
        <Chevron />
      </button>
      {open ? (
        <ul
          role='listbox'
          aria-label={label}
          onKeyDown={handleListKeyDown}
          className='animate-popover-enter absolute top-full left-0 z-20 mt-2 min-w-full origin-top border border-border bg-surface-elevated shadow-lg'
        >
          {options.map((option, index) => (
            <DropdownItem
              key={String(option.value)}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              option={option}
              selected={option.value === value}
              onSelect={() => handleSelect(option.value)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface DropdownItemProps<T> {
  option: DropdownOption<T>;
  selected: boolean;
  onSelect: () => void;
  ref: (node: HTMLButtonElement | null) => void;
}

function DropdownItem<T>({ option, selected, onSelect, ref }: DropdownItemProps<T>) {
  return (
    <li>
      <button
        ref={ref}
        type='button'
        role='option'
        aria-selected={selected}
        onClick={onSelect}
        className={cn(
          'flex w-full cursor-pointer items-center gap-2 px-3 py-2 font-mono text-label transition active:bg-accent-soft/60',
          selected ? 'bg-accent-soft text-accent' : 'text-text-secondary hover:bg-surface hover:text-text-primary',
        )}
      >
        <Icon src={option.iconUrl} alt='' size='sm' />
        <span>{option.label}</span>
      </button>
    </li>
  );
}

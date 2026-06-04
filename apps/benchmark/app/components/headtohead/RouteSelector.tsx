'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ASSET_SYMBOLS, ASSETS } from '~/lib/assets';
import { CHAIN_IDS, CHAINS } from '~/lib/chains';
import { cn } from '~/lib/cn';
import { useHeadToHeadRouteStore } from '~/lib/headToHeadRouteStore';

export function RouteSelector() {
  const route = useHeadToHeadRouteStore((state) => state.route);
  const setFromChainId = useHeadToHeadRouteStore((state) => state.setFromChainId);
  const setToChainId = useHeadToHeadRouteStore((state) => state.setToChainId);
  const setAssetSymbol = useHeadToHeadRouteStore((state) => state.setAssetSymbol);
  const swapChains = useHeadToHeadRouteStore((state) => state.swapChains);

  const from = CHAINS[route.fromChainId];
  const to = CHAINS[route.toChainId];
  const asset = ASSETS[route.assetSymbol];

  const assetOptions = ASSET_SYMBOLS.map((symbol) => ({
    value: symbol,
    label: ASSETS[symbol].displayName,
    dotClass: ASSETS[symbol].colorClass,
  }));
  const fromChainOptions = CHAIN_IDS.filter((id) => id !== route.toChainId).map((id) => ({
    value: id,
    label: CHAINS[id].displayName,
    dotClass: CHAINS[id].colorClass,
  }));
  const toChainOptions = CHAIN_IDS.filter((id) => id !== route.fromChainId).map((id) => ({
    value: id,
    label: CHAINS[id].displayName,
    dotClass: CHAINS[id].colorClass,
  }));

  return (
    <div className='flex items-center gap-3.5 border border-border bg-surface-elevated px-4 py-2.5'>
      <span className='font-mono text-label uppercase tracking-wider text-text-muted'>ROUTE</span>
      <div className='flex items-center gap-2 font-mono text-mark text-text-primary'>
        <InlinePicker
          ariaLabel='asset'
          value={route.assetSymbol}
          options={assetOptions}
          onChange={setAssetSymbol}
          triggerDotClass={asset.colorClass}
          triggerLabel={asset.displayName}
        />
        <span className='text-text-muted'>·</span>
        <InlinePicker
          ariaLabel='from chain'
          value={route.fromChainId}
          options={fromChainOptions}
          onChange={setFromChainId}
          triggerDotClass={from.colorClass}
          triggerLabel={from.displayName}
        />
        <button
          type='button'
          onClick={swapChains}
          aria-label='swap chains'
          className='cursor-pointer text-text-muted transition hover:text-text-primary active:scale-95'
        >
          →
        </button>
        <InlinePicker
          ariaLabel='to chain'
          value={route.toChainId}
          options={toChainOptions}
          onChange={setToChainId}
          triggerDotClass={to.colorClass}
          triggerLabel={to.displayName}
        />
      </div>
    </div>
  );
}

interface InlinePickerOption<T> {
  value: T;
  label: string;
  dotClass: string;
}

interface InlinePickerProps<T extends string | number> {
  ariaLabel: string;
  value: T;
  options: readonly InlinePickerOption<T>[];
  onChange: (value: T) => void;
  triggerDotClass: string;
  triggerLabel: string;
}

function InlinePicker<T extends string | number>({
  ariaLabel,
  value,
  options,
  onChange,
  triggerDotClass,
  triggerLabel,
}: InlinePickerProps<T>) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const target = selectedIndex >= 0 ? selectedIndex : 0;
    optionRefs.current[target]?.focus();
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
    const current = optionRefs.current.findIndex((node) => node === document.activeElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = current < 0 ? 0 : Math.min(current + 1, options.length - 1);
      optionRefs.current[next]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const previous = current <= 0 ? options.length - 1 : current - 1;
      optionRefs.current[previous]?.focus();
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
    <div ref={wrapperRef} className='relative inline-flex'>
      <button
        ref={triggerRef}
        type='button'
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${triggerLabel}`}
        className='inline-flex cursor-pointer items-center gap-2 transition active:scale-95'
      >
        <Dot className={triggerDotClass} />
        <span>{triggerLabel}</span>
      </button>
      {open ? (
        <ul
          role='listbox'
          aria-label={ariaLabel}
          onKeyDown={handleListKeyDown}
          className='animate-popover-enter absolute top-full left-0 z-20 mt-2 min-w-full origin-top border border-border bg-surface-elevated shadow-lg'
        >
          {options.map((option, index) => (
            <li key={String(option.value)}>
              <button
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                type='button'
                role='option'
                aria-selected={option.value === value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 px-3 py-2 font-mono text-label transition active:bg-accent-soft/60',
                  option.value === value
                    ? 'bg-accent-soft text-accent'
                    : 'text-text-secondary hover:bg-surface hover:text-text-primary',
                )}
              >
                <Dot className={option.dotClass} />
                <span>{option.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Dot({ className }: { className: string }) {
  return <span className={cn('inline-block size-1.5 rounded-full', className)} aria-hidden='true' />;
}

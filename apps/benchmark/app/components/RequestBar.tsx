'use client';

import { useMemo, useRef, useState } from 'react';
import { Arrow } from './Arrow';
import { Divider } from './Divider';
import { Dropdown, type DropdownOption } from './Dropdown';
import { Label } from './Label';
import { createRows, orderRaceRows } from './race-table/raceRows';
import { useRunRace } from './race-table/useRunRace';
import type { NetworkAssets } from '@wonderland/interop-cross-chain';
import { amountInputError, isWellFormedAmount, sanitizeAmountInput } from '~/lib/amountInput';
import { ASSET_SYMBOLS, ASSETS, AssetSymbol } from '~/lib/assets';
import { CHAIN_IDS, CHAINS, ChainId } from '~/lib/chains';
import { cn } from '~/lib/cn';
import { useRequestBarStore } from '~/lib/requestBarStore';

interface RequestBarProps {
  chains: NetworkAssets[];
}

function toChainOptions(exclude?: ChainId): DropdownOption<ChainId>[] {
  return CHAIN_IDS.filter((id) => id !== exclude).map((id) => ({
    value: id,
    label: CHAINS[id].displayName,
    iconUrl: CHAINS[id].iconUrl,
  }));
}

function toAssetOptions(): DropdownOption<AssetSymbol>[] {
  return ASSET_SYMBOLS.map((symbol) => ({
    value: symbol,
    label: ASSETS[symbol].displayName,
    iconUrl: ASSETS[symbol].iconUrl,
  }));
}

export function RequestBar({ chains }: RequestBarProps) {
  const request = useRequestBarStore((state) => state.request);
  const setFromChainId = useRequestBarStore((state) => state.setFromChainId);
  const setToChainId = useRequestBarStore((state) => state.setToChainId);
  const setAssetSymbol = useRequestBarStore((state) => state.setAssetSymbol);
  const setAmount = useRequestBarStore((state) => state.setAmount);
  const setPreset = useRequestBarStore((state) => state.setPreset);
  const swapChains = useRequestBarStore((state) => state.swapChains);
  const setRows = useRequestBarStore((state) => state.setRows);
  const { runRace, cancelRace } = useRunRace(chains);
  const [arrowSpins, setArrowSpins] = useState(0);
  const debounceTimer = useRef<number | null>(null);

  const fromOptions = useMemo(() => toChainOptions(request.toChainId), [request.toChainId]);
  const toOptions = useMemo(() => toChainOptions(request.fromChainId), [request.fromChainId]);
  const assetOptions = useMemo(() => toAssetOptions(), []);
  const presets = ASSETS[request.assetSymbol].presets;

  const clearPendingAmountRun = () => {
    if (debounceTimer.current === null) return;
    window.clearTimeout(debounceTimer.current);
    debounceTimer.current = null;
  };

  const handleFromChainChange = (id: ChainId) => {
    if (id === request.fromChainId) return;
    clearPendingAmountRun();
    setFromChainId(id);
    void runRace();
  };

  const handleToChainChange = (id: ChainId) => {
    if (id === request.toChainId) return;
    clearPendingAmountRun();
    setToChainId(id);
    void runRace();
  };

  const handleAssetChange = (symbol: AssetSymbol) => {
    if (symbol === request.assetSymbol) return;
    clearPendingAmountRun();
    setAssetSymbol(symbol);
    void runRace();
  };

  const handleSwap = () => {
    clearPendingAmountRun();
    swapChains();
    setArrowSpins((count) => count + 1);
    void runRace();
  };

  const handleAmountChange = (value: string) => {
    const sanitized = sanitizeAmountInput(value);
    setAmount({ amount: sanitized, selectedPreset: null });
    clearPendingAmountRun();
    if (isWellFormedAmount(sanitized)) {
      debounceTimer.current = window.setTimeout(() => {
        debounceTimer.current = null;
        void runRace();
      }, 200);
      return;
    }
    const error = amountInputError(sanitized);
    if (error === null) return;
    cancelRace();
    setRows(orderRaceRows(createRows('errored', error)));
  };

  const handlePresetClick = (presetIndex: number) => {
    clearPendingAmountRun();
    setPreset(presetIndex);
    void runRace();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    clearPendingAmountRun();
    void runRace();
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label='cross-chain quote request'
      className='border border-border bg-surface px-5 py-3 md:px-6 md:py-4'
    >
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:gap-6'>
        <div className='flex items-center gap-3 md:gap-5'>
          <Dropdown label='FROM' value={request.fromChainId} options={fromOptions} onChange={handleFromChainChange} />
          <Arrow onSwap={handleSwap} spinKey={arrowSpins} />
          <Dropdown label='TO' value={request.toChainId} options={toOptions} onChange={handleToChainChange} />
        </div>

        <Divider />
        <Dropdown
          label='ASSET'
          value={request.assetSymbol}
          options={assetOptions}
          onChange={handleAssetChange}
          minWidthClass='md:min-w-[6.25rem]'
        />
        <Divider />

        <div className='flex flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-4'>
          <AmountField amount={request.amount} error={amountInputError(request.amount)} onChange={handleAmountChange} />
          <div className='flex gap-1'>
            {presets.map((preset, index) => (
              <PresetPill
                key={preset.label}
                label={preset.label}
                selected={index === request.selectedPreset}
                onClick={() => handlePresetClick(index)}
                fillContainer
              />
            ))}
          </div>
        </div>

        <ReRunButton />
      </div>
    </form>
  );
}

interface AmountFieldProps {
  amount: string;
  error: string | null;
  onChange: (value: string) => void;
}

function AmountField({ amount, error, onChange }: AmountFieldProps) {
  return (
    <label className='flex flex-1 cursor-text flex-col gap-1.5'>
      <Label className='font-mono text-caption uppercase tracking-widest text-text-muted'>AMOUNT</Label>
      <input
        type='text'
        inputMode='decimal'
        value={amount}
        placeholder='0.00'
        aria-invalid={error !== null}
        aria-describedby={error === null ? undefined : 'amount-error'}
        onChange={(event) => onChange(event.target.value)}
        className='w-full bg-transparent font-sans text-lg font-medium tracking-tight text-text-primary outline-none placeholder:text-text-muted md:text-xl'
      />
      {error !== null && (
        <span id='amount-error' role='alert' className='font-mono text-caption text-error'>
          {error}
        </span>
      )}
    </label>
  );
}

function ReRunButton() {
  const [spinKey, setSpinKey] = useState(0);

  return (
    <div className='flex items-center justify-end'>
      <button
        type='submit'
        aria-label='re-run quote race'
        onClick={() => setSpinKey((count) => count + 1)}
        className='group inline-flex cursor-pointer items-center gap-2 border border-border bg-surface-elevated px-3 py-2.5 font-mono text-label text-text-secondary transition hover:border-text-secondary hover:text-text-primary active:scale-95'
      >
        <span aria-hidden='true' className='inline-block font-mono text-mark text-text-primary'>
          <span key={spinKey} className='animate-spin-once inline-block'>
            ↻
          </span>
        </span>
        <span className='hidden md:inline'>re-run</span>
      </button>
    </div>
  );
}

interface PresetPillProps {
  label: string;
  selected: boolean;
  fillContainer?: boolean;
  onClick: () => void;
}

const PRESET_BASE = 'cursor-pointer border px-2.5 py-1.5 font-mono text-label transition active:scale-95';
const PRESET_SELECTED = 'border-accent bg-accent-soft text-accent';
const PRESET_IDLE = 'border-border-subtle text-text-secondary hover:border-border hover:text-text-primary';

function PresetPill({ label, selected, fillContainer = false, onClick }: PresetPillProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        PRESET_BASE,
        selected ? PRESET_SELECTED : PRESET_IDLE,
        fillContainer && 'flex-1 text-center md:flex-none md:text-left',
      )}
    >
      {label}
    </button>
  );
}

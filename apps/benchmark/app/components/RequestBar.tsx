'use client';

import { useMemo, useState } from 'react';
import { Arrow } from './Arrow';
import { Divider } from './Divider';
import { Dropdown, type DropdownOption } from './Dropdown';
import { Label } from './Label';
import { ASSET_SYMBOLS, ASSETS, AssetSymbol } from '~/lib/assets';
import { CHAIN_IDS, CHAINS, ChainId } from '~/lib/chains';
import { cn } from '~/lib/cn';

const INITIAL_FROM = ChainId.Base;
const INITIAL_TO = ChainId.Arbitrum;
const INITIAL_ASSET = AssetSymbol.USDC;
const INITIAL_AMOUNT = '1,000.00';

const PRESETS = [
  { label: '$100', amount: '100.00' },
  { label: '$1k', amount: '1,000.00' },
  { label: '$10k', amount: '10,000.00' },
];
const INITIAL_PRESET = '$1k';

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

export function RequestBar() {
  const [fromChainId, setFromChainId] = useState<ChainId>(INITIAL_FROM);
  const [toChainId, setToChainId] = useState<ChainId>(INITIAL_TO);
  const [assetSymbol, setAssetSymbol] = useState<AssetSymbol>(INITIAL_ASSET);
  const [amount, setAmount] = useState(INITIAL_AMOUNT);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(INITIAL_PRESET);
  const [arrowSpins, setArrowSpins] = useState(0);

  const handleSwap = () => {
    setFromChainId(toChainId);
    setToChainId(fromChainId);
    setArrowSpins((count) => count + 1);
  };

  const fromOptions = useMemo(() => toChainOptions(toChainId), [toChainId]);
  const toOptions = useMemo(() => toChainOptions(fromChainId), [fromChainId]);
  const assetOptions = useMemo(() => toAssetOptions(), []);

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setSelectedPreset(null);
  };

  const handlePresetClick = (preset: { label: string; amount: string }) => {
    setAmount(preset.amount);
    setSelectedPreset(preset.label);
  };

  // TODO(pr-2): wire to quotesService.runRace.
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit} aria-label='cross-chain quote request' className='border-b border-border bg-surface'>
      <div className='mx-auto max-w-page px-5 py-3 md:px-12 md:py-4 lg:px-24'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:gap-6'>
          <div className='flex items-center gap-3 md:gap-5'>
            <Dropdown label='FROM' value={fromChainId} options={fromOptions} onChange={setFromChainId} />
            <Arrow onSwap={handleSwap} spinKey={arrowSpins} />
            <Dropdown label='TO' value={toChainId} options={toOptions} onChange={setToChainId} />
          </div>

          <Divider />
          <Dropdown
            label='ASSET'
            value={assetSymbol}
            options={assetOptions}
            onChange={setAssetSymbol}
            minWidthClass='md:min-w-[6.25rem]'
          />
          <Divider />

          <div className='flex flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-4'>
            <AmountField amount={amount} onChange={handleAmountChange} />
            <div className='flex gap-1'>
              {PRESETS.map((preset) => (
                <PresetPill
                  key={preset.label}
                  label={preset.label}
                  selected={preset.label === selectedPreset}
                  onClick={() => handlePresetClick(preset)}
                  fillContainer
                />
              ))}
            </div>
          </div>

          <ReRunButton />
        </div>
      </div>
    </form>
  );
}

interface AmountFieldProps {
  amount: string;
  onChange: (value: string) => void;
}

function AmountField({ amount, onChange }: AmountFieldProps) {
  return (
    <label className='flex flex-1 cursor-text flex-col gap-1.5'>
      <Label className='font-mono text-caption uppercase tracking-widest text-text-muted'>AMOUNT</Label>
      <input
        type='text'
        inputMode='decimal'
        value={amount}
        onChange={(event) => onChange(event.target.value)}
        className='w-full bg-transparent font-sans text-lg font-medium tracking-tight text-text-primary outline-none md:text-xl'
      />
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
        <span aria-hidden='true' className='inline-block text-mark text-text-primary'>
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

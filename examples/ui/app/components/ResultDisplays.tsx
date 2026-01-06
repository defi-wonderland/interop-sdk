'use client';

import { BinaryFormatDisplay } from './BinaryFormatDisplay';
import { DisplaySkeleton } from './DisplaySkeleton';
import { HumanReadableDisplay } from './HumanReadableDisplay';
import type { AddressResult, BinaryPart, HumanReadablePart } from '../types';

interface ResultDisplaysProps {
  isLoading: boolean;
  error: string;
  result: AddressResult | null;
  isStale: boolean;
  onRefresh: () => void;
  hoveredHuman: HumanReadablePart;
  setHoveredHuman: (part: HumanReadablePart) => void;
  hoveredBinary: BinaryPart;
  setHoveredBinary: (part: BinaryPart) => void;
  copied: boolean;
  onCopy: () => void;
}

function ResultsContainer({ children }: { children: React.ReactNode }) {
  return <div className='flex flex-col gap-6'>{children}</div>;
}

export function ResultDisplays({
  isLoading,
  error,
  result,
  isStale,
  onRefresh,
  hoveredHuman,
  setHoveredHuman,
  hoveredBinary,
  setHoveredBinary,
  copied,
  onCopy,
}: ResultDisplaysProps) {
  if (error) {
    return (
      <div
        data-testid='error-container'
        className='backdrop-blur-xl bg-error-light/80 border border-error/30 rounded-2xl p-4 shadow-lg break-words'
      >
        <p className='text-sm text-error font-medium'>{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <ResultsContainer>
        <DisplaySkeleton />
        <DisplaySkeleton />
      </ResultsContainer>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <ResultsContainer>
      {isStale && (
        <div className='flex items-center justify-between gap-3 rounded-xl border border-orange-400/60 bg-orange-500/10 px-3 py-2 text-xs text-orange-500'>
          <div className='flex items-center gap-2'>
            <span className='inline-block h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse' />
            <span>Result may not reflect the latest input.</span>
          </div>
          <button
            type='button'
            onClick={onRefresh}
            className='text-[11px] font-medium uppercase tracking-wide text-orange-500 hover:text-orange-600 underline underline-offset-2'
          >
            Refresh
          </button>
        </div>
      )}
      <HumanReadableDisplay
        result={result}
        hoveredPart={hoveredHuman}
        setHoveredPart={setHoveredHuman}
        copied={copied}
        onCopy={onCopy}
      />
      <BinaryFormatDisplay result={result} hoveredPart={hoveredBinary} setHoveredPart={setHoveredBinary} />
    </ResultsContainer>
  );
}

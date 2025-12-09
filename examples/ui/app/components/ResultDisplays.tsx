'use client';

import { BinaryFormatDisplay } from './BinaryFormatDisplay';
import { DisplaySkeleton } from './DisplaySkeleton';
import { HumanReadableDisplay } from './HumanReadableDisplay';
import type { AddressResult, BinaryPart, HumanReadablePart } from '../types';

interface ResultDisplaysProps {
  isLoading: boolean;
  error: string;
  result: AddressResult | null;
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
  hoveredHuman,
  setHoveredHuman,
  hoveredBinary,
  setHoveredBinary,
  copied,
  onCopy,
}: ResultDisplaysProps) {
  if (error) {
    return (
      <div className='backdrop-blur-xl bg-error-light/80 border border-error/30 rounded-2xl p-4 shadow-lg'>
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

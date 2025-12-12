'use client';

import { useState } from 'react';
import { InputMode, type HumanReadablePart, type BinaryPart, type AddressResult } from '../types';
import { convertFromReadable } from '../utils/address-conversion';
import { InputSection } from './InputSection';
import { ResultDisplays } from './ResultDisplays';
import type { Chain } from '../lib/getChains';

interface InteractivePlaygroundProps {
  chains: Chain[];
}

export function InteractivePlayground({ chains }: InteractivePlaygroundProps) {
  const [mode, setMode] = useState<InputMode>(InputMode.BUILD);
  const [readableName, setReadableName] = useState('');
  const [address, setAddress] = useState('');
  const [chainReference, setChainReference] = useState('');
  const [hoveredHuman, setHoveredHuman] = useState<HumanReadablePart>(null);
  const [hoveredBinary, setHoveredBinary] = useState<BinaryPart>(null);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<AddressResult | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const updateResult = (conversionResult: Awaited<ReturnType<typeof convertFromReadable>>) => {
    setResult({
      ...conversionResult.humanParts,
      humanReadable: conversionResult.humanReadable,
      binary: conversionResult.binary,
      ...conversionResult.binaryParts,
    });
  };

  const convertReadable = async () => {
    if (!readableName.trim()) return setResult(null);
    const result = await convertFromReadable(readableName);
    updateResult(result);
  };

  const convertBuild = async () => {
    if (!address.trim() || !chainReference.trim()) return setResult(null);
    const _readableName = `${address}@${chainReference}`;
    const result = await convertFromReadable(_readableName);
    updateResult(result);
  };

  const handleConvert = async () => {
    try {
      setError('');
      setIsLoading(true);
      const convert = mode === InputMode.READABLE ? convertReadable : convertBuild;
      await convert();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.humanReadable);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleExampleClick = (example: string) => {
    setMode(InputMode.READABLE);
    setReadableName(example);
  };

  return (
    <div className='flex flex-col gap-6'>
      <InputSection
        chains={chains}
        mode={mode}
        setMode={setMode}
        readableName={readableName}
        setReadableName={setReadableName}
        address={address}
        setAddress={setAddress}
        chainReference={chainReference}
        setChainReference={setChainReference}
        onConvert={handleConvert}
        onExampleClick={handleExampleClick}
        isLoading={isLoading}
      />

      <ResultDisplays
        isLoading={isLoading}
        error={error}
        result={result}
        hoveredHuman={hoveredHuman}
        setHoveredHuman={setHoveredHuman}
        hoveredBinary={hoveredBinary}
        setHoveredBinary={setHoveredBinary}
        copied={copied}
        onCopy={handleCopy}
      />
    </div>
  );
}

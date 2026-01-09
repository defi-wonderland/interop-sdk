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
  const [readableResult, setReadableResult] = useState<AddressResult | null>(null);
  const [buildResult, setBuildResult] = useState<AddressResult | null>(null);
  const [readableParsedResult, setReadableParsedResult] = useState<
    Awaited<ReturnType<typeof convertFromReadable>>['parsedResult'] | null
  >(null);
  const [buildParsedResult, setBuildParsedResult] = useState<
    Awaited<ReturnType<typeof convertFromReadable>>['parsedResult'] | null
  >(null);
  const [readableError, setReadableError] = useState('');
  const [buildError, setBuildError] = useState('');
  const [lastReadableInput, setLastReadableInput] = useState('');
  const [lastBuildAddress, setLastBuildAddress] = useState('');
  const [lastBuildChainReference, setLastBuildChainReference] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const updateReadableResult = (conversionResult: Awaited<ReturnType<typeof convertFromReadable>>) => {
    setReadableResult({
      ...conversionResult.humanParts,
      humanReadable: conversionResult.humanReadable,
      binary: conversionResult.binary,
      ...conversionResult.binaryParts,
    });
    setReadableParsedResult(conversionResult.parsedResult);
    setLastReadableInput(readableName.trim());
  };

  const updateBuildResult = (conversionResult: Awaited<ReturnType<typeof convertFromReadable>>) => {
    setBuildResult({
      ...conversionResult.humanParts,
      humanReadable: conversionResult.humanReadable,
      binary: conversionResult.binary,
      ...conversionResult.binaryParts,
    });
    setBuildParsedResult(conversionResult.parsedResult);
    setLastBuildAddress(address.trim());
    setLastBuildChainReference(chainReference.trim());
  };

  const convertReadable = async () => {
    try {
      setReadableError('');
      if (!readableName.trim()) return setReadableResult(null);
      const result = await convertFromReadable(readableName);
      updateReadableResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process';
      setReadableError(message);
      setReadableResult(null);
    }
  };

  const convertBuild = async () => {
    try {
      setBuildError('');
      if (!address.trim() || !chainReference.trim()) return setBuildResult(null);
      const _readableName = `${address}@${chainReference}`;
      const result = await convertFromReadable(_readableName);
      updateBuildResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process';
      setBuildError(message);
      setBuildResult(null);
      setBuildParsedResult(null);
    }
  };

  const handleConvert = async () => {
    setIsLoading(true);
    const convert = mode === InputMode.READABLE ? convertReadable : convertBuild;
    await convert();
    setIsLoading(false);
  };

  const handleCopy = async () => {
    const activeResult = mode === InputMode.READABLE ? readableResult : buildResult;

    if (!activeResult) return;
    try {
      await navigator.clipboard.writeText(activeResult.humanReadable);
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

  const activeResult = mode === InputMode.READABLE ? readableResult : buildResult;
  const activeError = mode === InputMode.READABLE ? readableError : buildError;
  const activeParsedResult = mode === InputMode.READABLE ? readableParsedResult : buildParsedResult;
  const isReadableStale = !!readableResult && Boolean(lastReadableInput) && lastReadableInput !== readableName.trim();
  const isBuildStale =
    !!buildResult &&
    Boolean(lastBuildAddress || lastBuildChainReference) &&
    (lastBuildAddress !== address.trim() || lastBuildChainReference !== chainReference.trim());
  const isStale = mode === InputMode.READABLE ? isReadableStale : isBuildStale;

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
        error={activeError}
        result={activeResult}
        parsedResult={activeParsedResult}
        isStale={isStale}
        onRefresh={handleConvert}
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

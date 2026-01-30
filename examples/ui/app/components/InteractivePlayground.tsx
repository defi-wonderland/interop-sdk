'use client';

import { useState } from 'react';
import { InputMode, type AddressResult } from '../types';
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
  const [binaryExpanded, setBinaryExpanded] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [readableResult, setReadableResult] = useState<AddressResult | null>(null);
  const [buildResult, setBuildResult] = useState<AddressResult | null>(null);
  const [readableError, setReadableError] = useState('');
  const [buildError, setBuildError] = useState('');
  const [lastReadableInput, setLastReadableInput] = useState('');
  const [lastBuildAddress, setLastBuildAddress] = useState('');
  const [lastBuildChainReference, setLastBuildChainReference] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const updateReadableResult = (conversionResult: Awaited<ReturnType<typeof convertFromReadable>>) => {
    const { parsedResult } = conversionResult;
    setReadableResult({
      ...conversionResult.nameParts,
      interoperableName: conversionResult.interoperableName,
      binary: conversionResult.binary,
      ...conversionResult.binaryParts,
      meta: {
        resolvedAddress: parsedResult.interoperableAddress.address || '',
        isENS: parsedResult.meta.isENS,
        isChainLabel: parsedResult.meta.isChainLabel,
        checksumMismatch: parsedResult.meta.checksumMismatch,
      },
    });
    setLastReadableInput(readableName.trim());
  };

  const updateBuildResult = (conversionResult: Awaited<ReturnType<typeof convertFromReadable>>) => {
    const { parsedResult } = conversionResult;
    setBuildResult({
      ...conversionResult.nameParts,
      interoperableName: conversionResult.interoperableName,
      binary: conversionResult.binary,
      ...conversionResult.binaryParts,
      meta: {
        resolvedAddress: parsedResult.interoperableAddress.address || '',
        isENS: parsedResult.meta.isENS,
        isChainLabel: parsedResult.meta.isChainLabel,
        checksumMismatch: parsedResult.meta.checksumMismatch,
      },
    });
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
      await navigator.clipboard.writeText(activeResult.interoperableName);
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
        isStale={isStale}
        onRefresh={handleConvert}
        binaryExpanded={binaryExpanded}
        setBinaryExpanded={setBinaryExpanded}
        advancedExpanded={advancedExpanded}
        setAdvancedExpanded={setAdvancedExpanded}
        copied={copied}
        onCopy={handleCopy}
      />
    </div>
  );
}

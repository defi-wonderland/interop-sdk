'use client';

import { useState } from 'react';
import { InputMode, ChainType, type HumanReadablePart, type BinaryPart, type AddressResult } from '../types';
import { convertFromReadable, convertFromAddress } from '../utils/address-conversion';
import { BinaryFormatDisplay } from './BinaryFormatDisplay';
import { HumanReadableDisplay } from './HumanReadableDisplay';
import { InputSection } from './InputSection';

export function InteractivePlayground() {
  const [mode, setMode] = useState<InputMode>(InputMode.READABLE);
  const [readableName, setReadableName] = useState('');
  const [address, setAddress] = useState('');
  const [chainType, setChainType] = useState(ChainType.EIP155);
  const [chainReference, setChainReference] = useState('');
  const [hoveredHuman, setHoveredHuman] = useState<HumanReadablePart>(null);
  const [hoveredBinary, setHoveredBinary] = useState<BinaryPart>(null);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<AddressResult | null>(null);
  const [error, setError] = useState('');

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
    const result = await convertFromAddress(address, chainType, chainReference);
    updateResult(result);
  };

  const handleConvert = async () => {
    try {
      setError('');
      const convert = mode === InputMode.READABLE ? convertReadable : convertBuild;
      await convert();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process');
      setResult(null);
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
        mode={mode}
        setMode={setMode}
        readableName={readableName}
        setReadableName={setReadableName}
        address={address}
        setAddress={setAddress}
        chainType={chainType}
        setChainType={setChainType}
        chainReference={chainReference}
        setChainReference={setChainReference}
        onConvert={handleConvert}
        onExampleClick={handleExampleClick}
      />

      {error && (
        <div className='backdrop-blur-xl bg-error-light/80 border border-error/30 rounded-2xl p-4 shadow-lg'>
          <p className='text-sm text-error font-medium'>{error}</p>
        </div>
      )}

      {result && (
        <div className='flex flex-col gap-6'>
          <HumanReadableDisplay
            result={result}
            hoveredPart={hoveredHuman}
            setHoveredPart={setHoveredHuman}
            copied={copied}
            onCopy={handleCopy}
          />
          <BinaryFormatDisplay result={result} hoveredPart={hoveredBinary} setHoveredPart={setHoveredBinary} />
        </div>
      )}
    </div>
  );
}

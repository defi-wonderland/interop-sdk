'use client';

import { useState, useEffect } from 'react';
import { BinaryPartKey, type AddressResult } from '../types';
import { formatChainReference } from '../utils/chain-names';
import { DisplaySkeleton } from './DisplaySkeleton';
import { ParsedField } from './ParsedField';
import { CopyIcon } from './icons/Icons';

interface ResultDisplaysProps {
  isLoading: boolean;
  error: string;
  result: AddressResult | null;
  isStale: boolean;
  onRefresh: () => void;
  binaryExpanded: boolean;
  setBinaryExpanded: (expanded: boolean) => void;
  advancedExpanded: boolean;
  setAdvancedExpanded: (expanded: boolean) => void;
  copied: boolean;
  onCopy: () => void;
}

function ChainReferenceValue({ chainReference, fullAddress }: { chainReference: string; fullAddress: string }) {
  const [formatted, setFormatted] = useState(chainReference);

  useEffect(() => {
    formatChainReference(chainReference, fullAddress).then(setFormatted);
  }, [chainReference, fullAddress]);

  return <>{formatted}</>;
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      viewBox='0 0 24 24'
      strokeWidth={2}
      stroke='currentColor'
      className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
    >
      <path strokeLinecap='round' strokeLinejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' />
    </svg>
  );
}

const BINARY_FIELDS: Array<{ key: BinaryPartKey; label: string; color: string; dotColor: string }> = [
  { key: BinaryPartKey.VERSION, label: 'version', color: 'text-text-primary', dotColor: 'bg-text-primary' },
  { key: BinaryPartKey.CHAIN_TYPE, label: 'chain type', color: 'text-chain-type', dotColor: 'bg-chain-type' },
  { key: BinaryPartKey.CHAIN_REF_LENGTH, label: 'length bytes', color: 'text-text-muted', dotColor: 'bg-text-muted' },
  { key: BinaryPartKey.CHAIN_REF, label: 'chain ref', color: 'text-chain-ref', dotColor: 'bg-chain-ref' },
  { key: BinaryPartKey.ADDRESS_LENGTH, label: 'length bytes', color: 'text-text-muted', dotColor: 'bg-text-muted' },
  { key: BinaryPartKey.ADDRESS, label: 'address', color: 'text-text-primary', dotColor: 'bg-text-primary' },
];

function getBinaryFieldValue(result: AddressResult, key: BinaryPartKey): string | null {
  switch (key) {
    case BinaryPartKey.VERSION:
      return result.version;
    case BinaryPartKey.CHAIN_TYPE:
      return result.chainTypeHex;
    case BinaryPartKey.CHAIN_REF_LENGTH:
      return result.chainRefLength.split(' ')[0];
    case BinaryPartKey.CHAIN_REF:
      return result.chainRefHex || null;
    case BinaryPartKey.ADDRESS_LENGTH:
      return result.addressLength.split(' ')[0];
    case BinaryPartKey.ADDRESS:
      return result.addressHex;
    default:
      return null;
  }
}

/** Renders an advanced field with label and value */
function AdvancedField({ label, value, isWarning }: { label: string; value: string; isWarning?: boolean }) {
  return (
    <div className='bg-background rounded-[10px] px-4 py-3 border border-border'>
      <div className='text-[11px] font-sans font-medium text-text-muted mb-1'>{label}</div>
      <div className={`text-[13px] font-medium break-all ${isWarning ? 'text-warning' : 'text-text-primary'}`}>
        {value}
      </div>
    </div>
  );
}

/** Renders the interoperable name with color-coded segments */
function ColorCodedName({ result }: { result: AddressResult }) {
  const { name, chainType, chainReference, checksum } = result;

  return (
    <>
      <span className='text-text-primary font-medium'>{name}</span>
      <span className='text-text-muted'> @ </span>
      {chainType && chainReference ? (
        <>
          <span className='text-chain-type font-medium'>{chainType}</span>
          <span className='text-text-muted'> : </span>
          <span className='text-chain-ref font-medium'>{chainReference}</span>
        </>
      ) : (
        <span className='text-chain-ref font-medium'>{chainType || chainReference}</span>
      )}
      {checksum && (
        <>
          <span className='text-text-muted'> # </span>
          <span className='text-checksum font-medium'>{checksum}</span>
        </>
      )}
    </>
  );
}

export function ResultDisplays({
  isLoading,
  error,
  result,
  isStale,
  onRefresh,
  binaryExpanded,
  setBinaryExpanded,
  advancedExpanded,
  setAdvancedExpanded,
  copied,
  onCopy,
}: ResultDisplaysProps) {
  if (error) {
    return (
      <div data-testid='error-container' className='bg-error-light border border-error/30 rounded-2xl p-4 break-words'>
        <p className='text-sm text-error font-medium'>{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return <DisplaySkeleton />;
  }

  if (!result) {
    return null;
  }

  const hasChecksum = !!result.checksum;
  const visibleBinaryFields = BINARY_FIELDS.filter((f) => getBinaryFieldValue(result, f.key));

  // Deduplicate legend entries by label
  const legendEntries = visibleBinaryFields.reduce(
    (acc, field) => {
      if (!acc.some((e) => e.label === field.label)) {
        acc.push(field);
      }
      return acc;
    },
    [] as typeof visibleBinaryFields,
  );

  return (
    <div
      data-testid='result-card'
      className='bg-surface rounded-2xl border border-border overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.38),0_0_60px_-10px_rgba(255,132,0,0.06)]'
    >
      {/* Stale warning */}
      {isStale && (
        <div className='flex items-center justify-between gap-3 border-b border-border px-4 py-2 text-xs text-orange-500 bg-orange-500/5'>
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

      {/* Interoperable Name section */}
      <div className='p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-[13px] font-sans font-medium text-text-muted'>Interoperable Name</h3>
          <button
            onClick={onCopy}
            className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-secondary text-text-muted text-xs hover:text-text-primary transition-colors cursor-pointer'
            title='Copy to clipboard'
          >
            <CopyIcon />
            <span className='font-sans text-xs'>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Color-coded inline display */}
        <div className='bg-background rounded-xl px-6 py-5 text-[15px] break-all mb-4 border border-border'>
          <ColorCodedName result={result} />
        </div>

        {/* Parsed fields grid */}
        <div className={`grid gap-3 ${hasChecksum ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
          <ParsedField label='Address' value={result.name} />
          <ParsedField
            label='Chain'
            value={
              <span className='text-chain-type'>
                <ChainReferenceValue
                  chainReference={result.chainReference || result.chainType}
                  fullAddress={result.interoperableName}
                />
              </span>
            }
          />
          {hasChecksum && (
            <ParsedField label='Checksum' value={<span className='text-checksum'>{result.checksum}</span>} />
          )}
        </div>
      </div>

      {/* Binary Encoding section - collapsible */}
      <div data-testid='binary-section' className='border-t border-border'>
        <button
          onClick={() => setBinaryExpanded(!binaryExpanded)}
          className='w-full flex items-center justify-between px-6 py-4 text-[13px] font-sans font-medium text-text-muted hover:bg-surface-secondary/50 transition-colors cursor-pointer'
        >
          <span>Binary Encoding (ERC-7930)</span>
          <ChevronIcon expanded={binaryExpanded} />
        </button>

        {binaryExpanded && (
          <div className='px-6 pb-6 flex flex-col gap-3'>
            {/* Color-coded hex display */}
            <div className='bg-background rounded-[10px] px-4 py-3 text-[13px] break-all border border-border'>
              <span className='text-text-muted'>0x</span>
              {visibleBinaryFields.map((field) => (
                <span key={field.key} className={`${field.color} font-medium`}>
                  {getBinaryFieldValue(result, field.key)}
                </span>
              ))}
            </div>

            {/* Legend */}
            <div className='flex flex-wrap gap-x-4 gap-y-1.5'>
              {legendEntries.map((field) => (
                <div key={field.label} className='flex items-center gap-1 text-[10px]'>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${field.dotColor}`} />
                  <span className='text-text-muted'>{field.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Advanced section - collapsible */}
      <div data-testid='advanced-section' className='border-t border-border'>
        <button
          onClick={() => setAdvancedExpanded(!advancedExpanded)}
          className='w-full flex items-center justify-between px-6 py-4 text-[13px] font-sans font-medium text-text-muted hover:bg-surface-secondary/50 transition-colors cursor-pointer'
        >
          <span>Advanced: Text & Meta Fields</span>
          <ChevronIcon expanded={advancedExpanded} />
        </button>

        {advancedExpanded && (
          <div className='px-6 pb-6 flex flex-col gap-3'>
            <p className='text-[11px] text-text-muted'>
              Raw text representation (CAIP-350) and metadata from parseName
            </p>

            {/* Text fields */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <AdvancedField label='Text: Version' value='1' />
              <AdvancedField label='Text: Chain Type' value={result.chainType || 'eip155'} />
              <AdvancedField label='Text: Chain Reference' value={result.chainReference} />
              <AdvancedField label='Text: Address' value={result.meta.resolvedAddress} />
            </div>

            {/* Meta fields */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <AdvancedField label='Meta: Checksum' value={result.checksum || '(none)'} />
              <AdvancedField
                label='Meta: Checksum Mismatch'
                value={
                  result.meta.checksumMismatch
                    ? `Provided: ${result.meta.checksumMismatch.provided}, Calculated: ${result.meta.checksumMismatch.calculated}`
                    : '(no mismatch)'
                }
                isWarning={!!result.meta.checksumMismatch}
              />
              <AdvancedField label='Meta: Is ENS' value={result.meta.isENS ? 'Yes' : 'No'} />
              <AdvancedField label='Meta: Is Chain Label' value={result.meta.isChainLabel ? 'Yes' : 'No'} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

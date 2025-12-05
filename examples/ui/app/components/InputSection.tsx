import React from 'react';
import { InputMode, ChainType } from '../types';
import { EXAMPLES } from '../utils/examples';
import { ExampleButtons, TabButton } from './index';

const CHAIN_TYPE_OPTIONS = [{ value: ChainType.EIP155, label: 'eip155' }] as const;

interface InputSectionProps {
  mode: InputMode;
  setMode: (mode: InputMode) => void;
  readableName: string;
  setReadableName: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  chainType: ChainType;
  setChainType: (value: ChainType) => void;
  chainReference: string;
  setChainReference: (value: string) => void;
  onConvert: () => void;
  onExampleClick: (example: string) => void;
}

export function InputSection({
  mode,
  setMode,
  readableName,
  setReadableName,
  address,
  setAddress,
  chainType,
  setChainType,
  chainReference,
  setChainReference,
  onConvert,
  onExampleClick,
}: InputSectionProps) {
  const isReadableMode = mode === InputMode.READABLE;
  const isBuildMode = mode === InputMode.BUILD;

  const readableModeExamples = React.useMemo(
    () =>
      EXAMPLES.map(({ humanReadable, description }) => ({
        key: humanReadable,
        description,
        onClick: () => onExampleClick(humanReadable),
      })),
    [onExampleClick],
  );

  const buildModeExamples = React.useMemo(
    () =>
      EXAMPLES.map((example) => ({
        key: example.address,
        description: example.description,
        onClick: () => {
          setAddress(example.address);
          setChainReference(example.chainReference);
        },
      })),
    [setAddress, setChainReference],
  );

  return (
    <div className='relative backdrop-blur-xl bg-surface/80 rounded-3xl border border-border/50 p-6 shadow-2xl'>
      <div className='absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-3xl pointer-events-none' />

      <div className='relative flex flex-col gap-6'>
        <div className='flex gap-2'>
          <TabButton isActive={isReadableMode} onClick={() => setMode(InputMode.READABLE)}>
            Enter Human-Readable
          </TabButton>
          <TabButton isActive={isBuildMode} onClick={() => setMode(InputMode.BUILD)}>
            Build from Address
          </TabButton>
        </div>

        {isReadableMode && (
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <label htmlFor='readable-address-input' className='text-sm font-medium text-text-secondary'>
                Human-Readable Address
              </label>
              <div className='flex flex-col sm:flex-row gap-2'>
                <input
                  id='readable-address-input'
                  type='text'
                  value={readableName}
                  onChange={(e) => setReadableName(e.target.value)}
                  placeholder='alice.eth@rollup-name'
                  className='flex-1 px-4 py-3 bg-background/50 backdrop-blur border border-border/50 rounded-xl font-mono text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all'
                />
                <button
                  onClick={onConvert}
                  className='w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-accent to-accent-hover text-white rounded-xl text-sm font-semibold hover:scale-105 transition-all shadow-lg shadow-accent/30 cursor-pointer'
                >
                  Convert
                </button>
              </div>
            </div>
            <ExampleButtons examples={readableModeExamples} />
          </div>
        )}

        {isBuildMode && (
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <label htmlFor='address-input' className='text-sm font-medium text-text-secondary'>
                Address
              </label>
              <input
                id='address-input'
                type='text'
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder='0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
                className='w-full px-4 py-3 bg-background/50 backdrop-blur border border-border/50 rounded-xl font-mono text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all'
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='flex flex-col gap-2'>
                <label htmlFor='chain-type-select' className='text-sm font-medium text-text-secondary'>
                  Chain Type
                </label>
                <select
                  id='chain-type-select'
                  value={chainType}
                  onChange={(e) => setChainType(e.target.value as ChainType)}
                  className='px-4 py-3 bg-background/50 backdrop-blur border border-border/50 rounded-xl text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all'
                >
                  {CHAIN_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className='flex flex-col gap-2'>
                <label htmlFor='chain-reference-input' className='text-sm font-medium text-text-secondary'>
                  Chain Reference
                </label>
                <input
                  id='chain-reference-input'
                  type='text'
                  value={chainReference}
                  onChange={(e) => setChainReference(e.target.value)}
                  placeholder='1, 0x1, eth, base'
                  className='px-4 py-3 bg-background/50 backdrop-blur border border-border/50 rounded-xl font-mono text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all'
                />
              </div>
            </div>
            <div className='flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-between'>
              <ExampleButtons examples={buildModeExamples} />
              <button
                onClick={onConvert}
                className='w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-accent to-accent-hover text-white rounded-xl text-sm font-semibold hover:scale-105 transition-all shadow-lg shadow-accent/30 cursor-pointer sm:self-end'
              >
                Convert
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { InputMode, ChainType } from '../types';
import { EXAMPLES } from '../utils/examples';
import { ChainDropdown } from './ChainDropdown';
import { ConvertButton, ExampleButtons, TabButton } from './index';
import type { Chain } from '../lib/getChains';

interface InputSectionProps {
  chains: Chain[];
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
  isLoading?: boolean;
}

export function InputSection({
  chains,
  mode,
  setMode,
  readableName,
  setReadableName,
  address,
  setAddress,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  chainType: _chainType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setChainType: _setChainType,
  chainReference,
  setChainReference,
  onConvert,
  onExampleClick,
  isLoading = false,
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
      EXAMPLES.filter((example) => {
        // Only include examples with readable chain references (not numeric like '1')
        // Readable chain references contain letters (e.g., 'eth', 'arb1')
        return !/^\d+$/.test(example.chainReference);
      }).map((example) => ({
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
          <TabButton isActive={isBuildMode} onClick={() => setMode(InputMode.BUILD)}>
            Build
          </TabButton>
          <TabButton isActive={isReadableMode} onClick={() => setMode(InputMode.READABLE)}>
            From text
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
                  autoComplete='off'
                  className='flex-1 px-4 py-3 bg-background/50 backdrop-blur border border-border/50 rounded-xl font-mono text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all'
                />
                <ConvertButton onClick={onConvert} isLoading={isLoading} />
              </div>
            </div>
            <ExampleButtons examples={readableModeExamples} />
          </div>
        )}

        {isBuildMode && (
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <label htmlFor='address-input' className='text-sm font-medium text-text-secondary'>
                Address @ Chain Reference
              </label>
              <div className='flex flex-col sm:flex-row gap-2 sm:items-center'>
                <input
                  id='address-input'
                  type='text'
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder='0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
                  autoComplete='off'
                  className='flex-1 px-4 py-3 bg-background/50 backdrop-blur border border-border/50 rounded-xl font-mono text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all'
                />
                <span className='hidden sm:inline text-text-secondary font-mono text-lg px-2'>@</span>
                <div className='flex-1'>
                  <ChainDropdown
                    chains={chains}
                    id='chain-reference-dropdown'
                    value={chainReference}
                    onChange={setChainReference}
                  />
                </div>
              </div>
            </div>
            <div className='flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-between'>
              <ExampleButtons examples={buildModeExamples} />
              <ConvertButton onClick={onConvert} isLoading={isLoading} className='sm:self-end' />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

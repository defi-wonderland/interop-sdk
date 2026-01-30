import React from 'react';
import { InputMode } from '../types';
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
  chainReference,
  setChainReference,
  onConvert,
  onExampleClick,
  isLoading = false,
}: InputSectionProps) {
  const isReadableMode = mode === InputMode.READABLE;
  const isBuildMode = mode === InputMode.BUILD;

  const isConvertDisabled = isReadableMode ? !readableName.trim() : !address.trim() || !chainReference.trim();

  const readableModeExamples = React.useMemo(
    () =>
      EXAMPLES.filter((example) => example.showInReadableMode).map(({ interoperableName, description }) => ({
        key: interoperableName,
        description,
        onClick: () => onExampleClick(interoperableName),
      })),
    [onExampleClick],
  );

  const buildModeExamples = React.useMemo(
    () =>
      EXAMPLES.filter((example) => example.showInBuildMode).map((example) => ({
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
    <div
      data-testid='input-card'
      className='bg-surface rounded-2xl border border-border overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.38),0_0_80px_-20px_rgba(255,132,0,0.08)]'
    >
      {/* Card Header with tabs */}
      <div className='px-6 py-3.5 border-b border-border'>
        <div className='inline-flex gap-1 p-1 bg-surface-secondary rounded-full'>
          <TabButton isActive={isBuildMode} onClick={() => setMode(InputMode.BUILD)}>
            Build
          </TabButton>
          <TabButton isActive={isReadableMode} onClick={() => setMode(InputMode.READABLE)}>
            Parse
          </TabButton>
        </div>
      </div>

      {/* Card Body: inputs + convert */}
      <div className='px-6 pb-6 flex flex-col gap-4'>
        {isReadableMode && (
          <div className='flex flex-col gap-1.5 pt-4'>
            <label htmlFor='readable-address-input' className='text-sm font-medium text-text-primary font-sans'>
              Interoperable Name
            </label>
            <input
              id='readable-address-input'
              type='text'
              value={readableName}
              onChange={(e) => setReadableName(e.target.value)}
              placeholder='alice.eth@eip155:1#4CA88C9C'
              autoComplete='off'
              data-1p-ignore
              className='w-full h-10 px-4 bg-background border border-border rounded-full text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors'
            />
          </div>
        )}

        {isBuildMode && (
          <div className='flex flex-col sm:flex-row gap-3 pt-4'>
            <div className='flex-1 flex flex-col gap-1.5'>
              <label htmlFor='address-input' className='text-sm font-medium text-text-primary font-sans'>
                Address
              </label>
              <input
                id='address-input'
                type='text'
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder='0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
                autoComplete='off'
                data-1p-ignore
                className='w-full h-10 px-4 bg-background border border-border rounded-full text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors'
              />
            </div>
            <div className='w-full sm:w-[200px] flex flex-col gap-1.5'>
              <label htmlFor='chain-reference-dropdown' className='text-sm font-medium text-text-primary font-sans'>
                Chain
              </label>
              <ChainDropdown
                chains={chains}
                id='chain-reference-dropdown'
                value={chainReference}
                onChange={setChainReference}
                className='h-10 rounded-full'
              />
            </div>
          </div>
        )}

        <ConvertButton onClick={onConvert} isLoading={isLoading} isDisabled={isConvertDisabled} />
      </div>

      {/* Examples */}
      <div className='px-6 pb-4'>
        <ExampleButtons examples={isReadableMode ? readableModeExamples : buildModeExamples} />
      </div>
    </div>
  );
}

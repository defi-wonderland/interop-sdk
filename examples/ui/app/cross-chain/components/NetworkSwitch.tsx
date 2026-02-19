'use client';

import { useIsTestnet, setNetworkAndReload } from '../providers';

export function NetworkSwitch() {
  const isTestnet = useIsTestnet();

  return (
    <div
      className='relative flex items-center rounded-full bg-surface-secondary p-1'
      role='radiogroup'
      aria-label='Network selection'
    >
      <div
        className='absolute top-1 bottom-1 rounded-full bg-accent transition-all duration-200 ease-out'
        style={{
          width: 'calc(50% - 4px)',
          left: isTestnet ? 'calc(50% + 2px)' : '4px',
        }}
      />

      <button
        role='radio'
        aria-checked={!isTestnet}
        onClick={() => isTestnet && setNetworkAndReload(false)}
        className={`relative z-10 flex-1 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
          !isTestnet ? 'text-white' : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        Mainnet
      </button>

      <button
        role='radio'
        aria-checked={isTestnet}
        onClick={() => !isTestnet && setNetworkAndReload(true)}
        className={`relative z-10 flex-1 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
          isTestnet ? 'text-white' : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        Testnet
      </button>
    </div>
  );
}

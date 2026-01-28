'use client';

import { useIsTestnet, setNetworkAndReload } from '../providers';

export function NetworkSwitch() {
  const isTestnet = useIsTestnet();

  const handleToggle = () => {
    setNetworkAndReload(!isTestnet);
  };

  return (
    <div className='flex items-center gap-2'>
      <span className='text-sm text-gray-400'>{isTestnet ? 'Testnet' : 'Mainnet'}</span>
      <button
        onClick={handleToggle}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${isTestnet ? 'bg-blue-600' : 'bg-gray-600'}
        `}
        role='switch'
        aria-checked={isTestnet}
        aria-label='Toggle between testnet and mainnet'
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${isTestnet ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}

import type { Chain } from '../lib/getChains';

interface DropdownContentProps {
  filteredChains: Chain[];
  onSelect: (chain: Chain) => void;
}

export function DropdownContent({ filteredChains, onSelect }: DropdownContentProps) {
  if (filteredChains.length === 0) {
    return <div className='px-4 py-3 text-sm text-text-secondary'>No chains found</div>;
  }

  return (
    <>
      {filteredChains.slice(0, 50).map((chain) => (
        <button
          key={chain.chainId}
          type='button'
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(chain)}
          className='w-full text-left px-4 py-2 hover:bg-accent-light/20 cursor-pointer'
        >
          <div className='font-medium text-sm'>{chain.name}</div>
          <div className='text-xs text-text-secondary'>
            {chain.shortName} • Chain ID: {chain.chainId}
          </div>
        </button>
      ))}
    </>
  );
}

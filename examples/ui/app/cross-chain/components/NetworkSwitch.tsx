'use client';

import { useCrossChainStore } from '../stores/crossChainStore';
import { SegmentedToggle } from './SegmentedToggle';

interface NetworkSwitchProps {
  disabled?: boolean;
}

type NetworkValue = 'mainnet' | 'testnet';

const OPTIONS: { value: NetworkValue; label: string }[] = [
  { value: 'mainnet', label: 'Mainnet' },
  { value: 'testnet', label: 'Testnet' },
];

export function NetworkSwitch({ disabled = false }: NetworkSwitchProps) {
  const isTestnet = useCrossChainStore((s) => s.isTestnet);
  const setIsTestnet = useCrossChainStore((s) => s.setIsTestnet);

  return (
    <SegmentedToggle
      options={OPTIONS}
      value={isTestnet ? 'testnet' : 'mainnet'}
      onChange={(value) => setIsTestnet(value === 'testnet')}
      ariaLabel='Network selection'
      disabled={disabled}
    />
  );
}

import type { BenchmarkColumn } from '../BenchmarkTable';
import { ProviderId, PROVIDERS } from '~/lib/providers';

export const RACE_PROVIDER_IDS = [ProviderId.Across, ProviderId.Relay, ProviderId.Lifi, ProviderId.Bungee] as const;

export const RACE_PROVIDERS = RACE_PROVIDER_IDS.map((providerId) => PROVIDERS[providerId]);

export const RACE_TABLE_COLUMNS: readonly BenchmarkColumn[] = [
  { key: 'rank', label: 'RANK', className: 'w-10 md:w-12' },
  { key: 'provider', label: 'PROVIDER', className: 'md:w-60' },
  { key: 'latency', label: 'LATENCY', className: 'hidden md:table-cell' },
  {
    key: 'output',
    label: 'OUTPUT',
    className: 'text-right md:w-[200px]',
    tooltip: 'The winner is the provider that returns the most output.',
  },
  { key: 'eta', label: 'ETA', className: 'hidden md:table-cell md:w-[100px] text-right' },
  { key: 'status', label: 'STATUS', className: 'hidden md:table-cell md:w-[160px] text-right' },
];

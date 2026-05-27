import type { BenchmarkColumn } from '../BenchmarkTable';
import { ProviderId, PROVIDERS } from '~/lib/providers';

export const USER_PLACEHOLDER = '0x000000000000000000000000000000000000dEaD';

export const RACE_PROVIDER_IDS = [ProviderId.Across, ProviderId.Relay, ProviderId.Lifi, ProviderId.Bungee] as const;

export const RACE_PROVIDERS = RACE_PROVIDER_IDS.map((providerId) => PROVIDERS[providerId]);

export const RACE_TABLE_COLUMNS: readonly BenchmarkColumn[] = [
  { key: 'rank', label: 'rank', className: 'w-10 md:w-12' },
  { key: 'provider', label: 'provider', className: 'md:w-60' },
  { key: 'latency', label: 'latency', className: 'hidden md:table-cell' },
  { key: 'output', label: 'output', className: 'text-right md:w-[200px]' },
  { key: 'eta', label: 'eta', className: 'hidden md:table-cell md:w-[100px] text-right' },
  { key: 'status', label: 'status', className: 'hidden md:table-cell md:w-[160px] text-right' },
];

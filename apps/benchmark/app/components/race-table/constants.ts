import type { BenchmarkColumn } from '../BenchmarkTable';
import { ProviderId, PROVIDERS } from '~/lib/providers';

export const USER_PLACEHOLDER = '0x000000000000000000000000000000000000dEaD';

export const RACE_PROVIDER_IDS = [ProviderId.Across, ProviderId.Relay, ProviderId.Lifi, ProviderId.Bungee] as const;

export const RACE_PROVIDERS = RACE_PROVIDER_IDS.map((providerId) => PROVIDERS[providerId]);

export const RACE_TABLE_COLUMNS: readonly BenchmarkColumn[] = [
  { key: 'rank', label: 'rank', className: 'w-12' },
  { key: 'provider', label: 'provider' },
  { key: 'latency', label: 'latency' },
  { key: 'output', label: 'output', className: 'text-right' },
  { key: 'eta', label: 'eta', className: 'text-right' },
  { key: 'status', label: '', className: 'text-right' },
];

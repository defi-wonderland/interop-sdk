import type { BenchmarkColumn } from '../BenchmarkTable';

export const LEADERBOARD_COLUMNS: readonly BenchmarkColumn[] = [
  { key: 'rank', label: '#', className: 'w-10 md:w-12' },
  { key: 'provider', label: 'PROVIDER' },
  { key: 'fills', label: 'FILLS 24H', className: 'hidden text-right md:table-cell md:w-32' },
  { key: 'success', label: 'SUCCESS ▼', className: 'text-right md:w-32' },
  { key: 'p50', label: 'P50 FILL', className: 'hidden text-right md:table-cell md:w-32' },
  { key: 'p99', label: 'P99 FILL', className: 'hidden text-right md:table-cell md:w-32' },
  { key: 'fee', label: 'AVG FEE', className: 'text-right md:w-28' },
];

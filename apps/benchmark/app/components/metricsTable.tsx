import type { ReactNode } from 'react';
import type { BenchmarkColumn } from './BenchmarkTable';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';

// Shared cell padding for non-numeric stack cells (rank, provider).
export const METRICS_CELL_STACK = 'px-3 py-4 md:px-4 md:py-5';

// Right-aligned numeric cell with fixed-width digits.
export const METRICS_CELL_NUM = `${METRICS_CELL_STACK} text-right font-mono text-mark tabular-nums`;

// Numeric cell that hides on mobile and reveals at the `md` breakpoint.
export const METRICS_CELL_NUM_HIDDEN = `hidden ${METRICS_CELL_NUM} md:table-cell`;

// Base `<tr>` classes shared by every metrics-style table row.
export const METRICS_ROW_CLASS = 'h-16 border-b border-border-subtle align-middle last:border-b-0 md:h-[72px]';

export interface MetricsColumn<Ctx> extends BenchmarkColumn {
  tdClass: string;
  render: (metrics: ProviderMetrics, ctx: Ctx) => ReactNode;
}

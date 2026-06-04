import { Fragment, type ReactNode } from 'react';
import { InfoTooltip } from './InfoTooltip';
import { cn } from '~/lib/cn';

export interface BenchmarkColumn {
  key: string;
  label: string;
  className?: string;
  /** Plain-language explanation rendered as a hover tooltip on the header label. */
  tooltip?: string;
}

interface BenchmarkTableProps<T> {
  columns: readonly BenchmarkColumn[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  renderRow: (row: T, index: number) => ReactNode;
  minWidthClass?: string;
}

export function BenchmarkTable<T>({
  columns,
  rows,
  getRowKey,
  renderRow,
  minWidthClass = 'md:min-w-[48rem]',
}: BenchmarkTableProps<T>) {
  return (
    <div className='md:overflow-x-auto'>
      <table className={cn('w-full table-fixed border-collapse text-left md:table-auto', minWidthClass)}>
        <thead>
          <tr className='border-b border-border-subtle font-mono text-caption uppercase tracking-widest text-text-muted'>
            {columns.map((column) => (
              <th key={column.key} className={cn('px-3 py-3 font-medium md:px-4', column.className)}>
                {column.tooltip ? <InfoTooltip label={column.label} text={column.tooltip} /> : column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <Fragment key={getRowKey(row)}>{renderRow(row, index)}</Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

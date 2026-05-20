import { Fragment, type ReactNode } from 'react';
import { cn } from '~/lib/cn';

export interface BenchmarkColumn {
  key: string;
  label: string;
  className?: string;
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
  minWidthClass = 'min-w-[48rem]',
}: BenchmarkTableProps<T>) {
  return (
    <div className='overflow-x-auto'>
      <table className={cn('w-full border-collapse text-left', minWidthClass)}>
        <thead>
          <tr className='border-b border-border-subtle font-mono text-caption uppercase tracking-widest text-text-muted'>
            {columns.map((column) => (
              <th key={column.key} className={cn('px-4 py-3 font-medium', column.className)}>
                {column.label}
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

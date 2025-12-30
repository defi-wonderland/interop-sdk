'use client';

import { useState } from 'react';
import { WarningIcon, ChevronDownIcon } from './icons';

interface ErrorItem {
  errorMsg: string;
  error: Error;
}

interface ErrorListProps {
  errors: ErrorItem[];
}

export function ErrorList({ errors }: ErrorListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className='rounded-lg border border-error/20 bg-error-light/10 overflow-hidden'>
      {/* Header - Always visible */}
      <button
        type='button'
        onClick={() => setIsExpanded(!isExpanded)}
        className='w-full px-4 py-3 flex items-center justify-between hover:bg-error-light/20 transition-colors'
      >
        <div className='flex items-center gap-2'>
          <WarningIcon className='w-4 h-4 text-error' />
          <span className='font-medium text-error'>
            {errors.length} {errors.length === 1 ? 'Error' : 'Errors'}
          </span>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-error transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Error list - Expandable */}
      {isExpanded && (
        <div className='border-t border-error/20 max-h-64 overflow-y-auto overscroll-contain scrollbar-custom'>
          <ul className='divide-y divide-error/10'>
            {errors.map((err, index) => (
              <li key={index} className='px-4 py-3'>
                <div className='text-sm font-medium text-error mb-1'>{err.errorMsg}</div>
                <div className='text-xs text-error/80'>{err.error.message}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

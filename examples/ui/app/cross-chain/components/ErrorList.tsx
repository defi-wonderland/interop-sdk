'use client';

import { useState } from 'react';

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
          <svg className='w-4 h-4 text-error' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
            />
          </svg>
          <span className='font-medium text-error'>
            {errors.length} {errors.length === 1 ? 'Error' : 'Errors'}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-error transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
        </svg>
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

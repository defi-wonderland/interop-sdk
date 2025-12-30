'use client';

interface ErrorQuoteCardProps {
  errorMsg: string;
  error: Error;
}

export function ErrorQuoteCard({ errorMsg, error }: ErrorQuoteCardProps) {
  return (
    <div className='p-4 rounded-lg border border-error/20 bg-error-light/10'>
      <div className='font-medium text-error mb-2'>{errorMsg}</div>
      <div className='text-sm text-error'>{error.message}</div>
    </div>
  );
}

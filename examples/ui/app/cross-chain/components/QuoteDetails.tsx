'use client';

import { useState } from 'react';
import { highlightJson } from '../utils/jsonHighlighter';
import { CodeIcon, ChevronDownIcon } from './icons';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';

interface QuoteDetailsProps {
  quote: ExecutableQuote;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type='button'
      onClick={handleCopy}
      className='px-2 py-1 text-xs rounded bg-surface-secondary/80 backdrop-blur-sm text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors border border-border'
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export function QuoteDetails({ quote }: QuoteDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rawJson = JSON.stringify(quote, null, 2);

  return (
    <div className='rounded-xl border border-border bg-surface overflow-hidden'>
      {/* Header - Always visible, clickable to expand */}
      <button
        type='button'
        onClick={() => setIsExpanded(!isExpanded)}
        className='w-full px-4 py-3 flex items-center justify-between hover:bg-surface-secondary transition-colors'
      >
        <div className='flex items-center gap-2'>
          <CodeIcon className='w-4 h-4 text-accent' />
          <span className='text-sm font-medium text-text-primary'>Raw Quote Data</span>
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className='border-t border-border relative'>
          {/* Copy button - absolute positioned */}
          <div className='absolute top-2 right-4 z-10'>
            <CopyButton text={rawJson} />
          </div>

          {/* JSON with syntax highlighting */}
          <div className='p-4 pt-10 max-h-96 overflow-y-auto scrollbar-custom bg-background'>
            <code className='text-xs font-mono text-text-primary'>{highlightJson(rawJson)}</code>
          </div>
        </div>
      )}
    </div>
  );
}

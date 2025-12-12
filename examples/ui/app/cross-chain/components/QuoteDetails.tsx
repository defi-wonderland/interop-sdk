'use client';

import { useState } from 'react';
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

/**
 * Simple JSON syntax highlighter using design system colors
 */
function highlightJson(json: string): React.ReactNode[] {
  const lines = json.split('\n');

  return lines.map((line, lineIndex) => {
    const parts: React.ReactNode[] = [];
    let keyIndex = 0;

    // Match patterns: keys, strings, numbers, booleans, null
    const regex = /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(-?\d+\.?\d*)|(\btrue\b|\bfalse\b)|(\bnull\b)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(<span key={`${lineIndex}-${keyIndex++}`}>{line.slice(lastIndex, match.index)}</span>);
      }

      if (match[1]) {
        // Key (string followed by colon) - light/white
        parts.push(
          <span key={`${lineIndex}-${keyIndex++}`} className='text-text-primary'>
            {match[1]}
          </span>,
        );
        parts.push(<span key={`${lineIndex}-${keyIndex++}`}>:</span>);
      } else if (match[2]) {
        // String value - blue/accent
        parts.push(
          <span key={`${lineIndex}-${keyIndex++}`} className='text-accent'>
            {match[2]}
          </span>,
        );
      } else if (match[3]) {
        // Number - lighter blue
        parts.push(
          <span key={`${lineIndex}-${keyIndex++}`} className='text-accent-hover'>
            {match[3]}
          </span>,
        );
      } else if (match[4]) {
        // Boolean - muted
        parts.push(
          <span key={`${lineIndex}-${keyIndex++}`} className='text-text-secondary'>
            {match[4]}
          </span>,
        );
      } else if (match[5]) {
        // Null - dimmed
        parts.push(
          <span key={`${lineIndex}-${keyIndex++}`} className='text-text-tertiary'>
            {match[5]}
          </span>,
        );
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < line.length) {
      parts.push(<span key={`${lineIndex}-${keyIndex++}`}>{line.slice(lastIndex)}</span>);
    }

    return (
      <div key={lineIndex} className='whitespace-pre'>
        {parts.length > 0 ? parts : line}
      </div>
    );
  });
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
          <svg className='w-4 h-4 text-accent' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
            />
          </svg>
          <span className='text-sm font-medium text-text-primary'>Raw Quote Data</span>
        </div>
        <svg
          className={`w-4 h-4 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
        </svg>
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

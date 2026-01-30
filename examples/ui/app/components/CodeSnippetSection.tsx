'use client';

import { useState } from 'react';
import { CopyIcon } from './icons/Icons';

const CODE_SNIPPET = `import { parseName } from '@wonderland/interop-addresses';

const result = await parseName('vitalik.eth@eip155:1');
// → { name, interoperableAddress, meta: { checksum, isENS } }`;

function SyntaxHighlightedCode() {
  return (
    <>
      <span className='text-purple-400'>import</span>
      <span className='text-text-primary'> {'{ '}</span>
      <span className='text-yellow-300'>parseName</span>
      <span className='text-text-primary'>{' }'} </span>
      <span className='text-purple-400'>from</span>
      <span className='text-green-400'> &apos;@wonderland/interop-addresses&apos;</span>
      <span className='text-text-muted'>;</span>
      {'\n\n'}
      <span className='text-purple-400'>const</span>
      <span className='text-sky-300'> result</span>
      <span className='text-text-primary'> = </span>
      <span className='text-purple-400'>await</span>
      <span className='text-yellow-300'> parseName</span>
      <span className='text-text-primary'>(</span>
      <span className='text-green-400'>&apos;vitalik.eth@eip155:1&apos;</span>
      <span className='text-text-primary'>)</span>
      <span className='text-text-muted'>;</span>
      {'\n'}
      <span className='text-text-muted'>{'// → { name, interoperableAddress, meta: { checksum, isENS } }'}</span>
    </>
  );
}

export function CodeSnippetSection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CODE_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail
    }
  };

  return (
    <div className='bg-surface rounded-2xl border border-border overflow-hidden'>
      <div className='flex items-center justify-between px-6 py-3 border-b border-border'>
        <span className='text-[13px] font-sans font-medium text-text-muted'>SDK Usage</span>
        <button
          onClick={handleCopy}
          className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-secondary text-text-muted text-xs hover:text-text-primary transition-colors cursor-pointer'
          title='Copy to clipboard'
        >
          <CopyIcon />
          <span className='font-sans text-xs'>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <pre className='px-6 py-5 text-[13px] leading-relaxed overflow-x-auto'>
        <code>
          <SyntaxHighlightedCode />
        </code>
      </pre>
    </div>
  );
}

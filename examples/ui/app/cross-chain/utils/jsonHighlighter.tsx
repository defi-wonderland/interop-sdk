import type { ReactNode } from 'react';

/**
 * Simple JSON syntax highlighter using design system colors
 */
export function highlightJson(json: string): ReactNode[] {
  const lines = json.split('\n');

  return lines.map((line, lineIndex) => {
    const parts: ReactNode[] = [];
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

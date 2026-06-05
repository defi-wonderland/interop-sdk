import { Label } from './Label';

interface ChevronProps {
  /**
   * `caret` is the text-size companion the request bar dropdowns use.
   * `solid` swaps U+25BE for U+25BC at a smaller font size: the "small"
   * triangle draws a tiny glyph inside its em-square and gets lost on
   * compact chip triggers, while the full triangle reads clearly.
   */
  variant?: 'caret' | 'solid';
}

export function Chevron({ variant = 'caret' }: ChevronProps) {
  if (variant === 'solid') {
    return (
      <Label className='font-mono text-[9px] leading-none text-text-muted' aria-hidden='true'>
        ▼
      </Label>
    );
  }

  return (
    <Label className='font-mono text-caption text-text-muted' aria-hidden='true'>
      ▾
    </Label>
  );
}

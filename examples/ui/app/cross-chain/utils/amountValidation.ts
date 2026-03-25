/** Sanitizes amount input: strips invalid chars, normalizes comma to dot, handles ".5" → "0.5" */
export function sanitizeAmountInput(value: string, currentValue: string): string {
  const sanitized = value.replace(/[^\d.,]/g, '');
  const normalized = sanitized.replace(/,/g, '.');

  if (normalized.split('.').length > 2) {
    return currentValue;
  }

  if (normalized.startsWith('.')) {
    return '0' + normalized;
  }

  return normalized;
}

/** Trims whitespace and replaces comma with dot */
export function normalizeAmount(value: string): string {
  return value.trim().replace(',', '.');
}

/** Returns true if value is a valid non-negative number */
export function isValidAmount(value: string): boolean {
  if (!value) return false;
  const normalized = normalizeAmount(value);
  if (!/^\d+\.?\d*$/.test(normalized)) return false;
  return !isNaN(parseFloat(normalized));
}

/** Formats the fee between two same-token amounts, e.g. "Fee: 0.0030 (0.60%)". Returns null if not applicable. */
export function formatFee(inputAmount: string, outputAmount: string): string | null {
  const input = parseFloat(normalizeAmount(inputAmount));
  const output = parseFloat(normalizeAmount(outputAmount));
  if (!input || isNaN(output) || output >= input) return null;
  const fee = input - output;
  return `Fee: ${fee.toFixed(4)} (${((fee / input) * 100).toFixed(2)}%)`;
}

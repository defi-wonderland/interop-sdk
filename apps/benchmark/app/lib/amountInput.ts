const DECIMAL_AMOUNT_RE = /^\d+(\.\d+)?$/;

export function sanitizeAmountInput(value: string): string {
  return value.replace(/[^\d.,]/g, '');
}

export function isWellFormedAmount(value: string): boolean {
  if (!value) return false;
  if (value.includes(',') && !hasValidThousandSeparators(value)) return false;
  return DECIMAL_AMOUNT_RE.test(value.replace(/,/g, ''));
}

export function amountInputError(value: string): string | null {
  if (!value || isWellFormedAmount(value)) return null;
  // A trailing separator is an amount still being typed, not a malformed one.
  if (isWellFormedAmount(value.replace(/[.,]$/, ''))) return null;
  return 'Enter a valid amount';
}

function hasValidThousandSeparators(value: string): boolean {
  const [integerPart, ...rest] = value.split('.');
  if (rest.length > 1) return false;
  if (rest[0]?.includes(',')) return false;
  if (!integerPart || integerPart.includes(',,')) return false;

  const digitsOnly = integerPart.replace(/,/g, '');
  if (!/^\d+$/.test(digitsOnly)) return false;

  const reformatted = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return reformatted === integerPart;
}

/**
 * Maps blockchain/wallet errors to user-friendly messages
 */

interface ParsedError {
  title: string;
  message: string;
}

// Known error codes from MetaMask and other wallets
const WALLET_ERROR_CODES: Record<number, ParsedError> = {
  4001: {
    title: 'Transaction Rejected',
    message: 'You rejected the transaction in your wallet.',
  },
  4100: {
    title: 'Unauthorized',
    message: 'The requested account is not authorized.',
  },
  4200: {
    title: 'Unsupported Method',
    message: 'This method is not supported by your wallet.',
  },
  4900: {
    title: 'Disconnected',
    message: 'Your wallet is disconnected from the chain.',
  },
  4901: {
    title: 'Chain Disconnected',
    message: 'Your wallet is not connected to the requested chain.',
  },
  // Internal JSON-RPC errors
  '-32700': {
    title: 'Parse Error',
    message: 'Invalid request format.',
  },
  '-32600': {
    title: 'Invalid Request',
    message: 'The request is not valid.',
  },
  '-32601': {
    title: 'Method Not Found',
    message: 'The requested method does not exist.',
  },
  '-32602': {
    title: 'Invalid Parameters',
    message: 'Invalid method parameters.',
  },
  '-32603': {
    title: 'Internal Error',
    message: 'Internal wallet error occurred.',
  },
};

// Known error message patterns
const ERROR_PATTERNS: Array<{ pattern: RegExp; result: ParsedError }> = [
  {
    pattern: /user denied|user rejected|rejected by user/i,
    result: {
      title: 'Transaction Rejected',
      message: 'You rejected the transaction.',
    },
  },
  {
    pattern: /current chain.*does not match|chain mismatch|wrong network|wrong chain/i,
    result: {
      title: 'Wrong Network',
      message: 'Please switch to the correct network in your wallet and try again.',
    },
  },
  {
    pattern: /insufficient funds/i,
    result: {
      title: 'Insufficient Funds',
      message: "You don't have enough funds for this transaction.",
    },
  },
  {
    pattern: /gas too low|intrinsic gas too low/i,
    result: {
      title: 'Gas Too Low',
      message: 'The gas limit is too low for this transaction.',
    },
  },
  {
    pattern: /gas limit too high/i,
    result: {
      title: 'Gas Limit Too High',
      message: 'The gas limit exceeds the maximum allowed.',
    },
  },
  {
    pattern: /nonce too low/i,
    result: {
      title: 'Nonce Error',
      message: 'Transaction nonce is too low. Try again.',
    },
  },
  {
    pattern: /replacement.*underpriced/i,
    result: {
      title: 'Underpriced Transaction',
      message: 'Gas price is too low to replace the pending transaction.',
    },
  },
  {
    pattern: /exceeds.*allowance|exceeds.*balance/i,
    result: {
      title: 'Insufficient Allowance',
      message: 'Token allowance is insufficient for this transfer.',
    },
  },
  {
    pattern: /execution reverted/i,
    result: {
      title: 'Transaction Failed',
      message: 'The transaction would fail. Check your inputs.',
    },
  },
  {
    pattern: /network.*error|fetch.*failed|connection/i,
    result: {
      title: 'Network Error',
      message: 'Unable to connect. Check your internet connection.',
    },
  },
  {
    pattern: /timeout/i,
    result: {
      title: 'Request Timeout',
      message: 'The request timed out. Please try again.',
    },
  },
];

/**
 * Parse an error and return a user-friendly message
 */
export function parseError(error: unknown): ParsedError {
  // Handle null/undefined
  if (!error) {
    return {
      title: 'Unknown Error',
      message: 'An unexpected error occurred.',
    };
  }

  // Extract error details
  const err = error as { code?: number; message?: string; shortMessage?: string };
  const code = err.code;
  const message = err.shortMessage || err.message || String(error);

  // Check for known error codes
  if (code && WALLET_ERROR_CODES[code]) {
    return WALLET_ERROR_CODES[code];
  }

  // Check for known patterns in error message
  for (const { pattern, result } of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return result;
    }
  }

  // Default: truncate long messages
  const truncatedMessage = message.length > 100 ? message.slice(0, 100) + '...' : message;

  return {
    title: 'Transaction Failed',
    message: truncatedMessage,
  };
}

/**
 * Get a short, toast-friendly error message
 */
export function getToastErrorMessage(error: unknown): string {
  const parsed = parseError(error);
  return parsed.message;
}

/**
 * Check if an error is a user rejection (user cancelled the transaction in wallet)
 */
export function isUserRejectionError(error: unknown): boolean {
  if (!error) return false;

  const err = error as { code?: number; message?: string; shortMessage?: string };

  // Check for user rejection error code (4001 is standard EIP-1193)
  if (err.code === 4001) {
    return true;
  }

  // Check message patterns
  const message = err.shortMessage || err.message || String(error);
  return /user denied|user rejected|rejected by user/i.test(message);
}

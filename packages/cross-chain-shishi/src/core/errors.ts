export type ErrorCode =
  | "QUOTE_TIMEOUT"
  | "ADAPTER_NOT_FOUND"
  | "EXECUTE_FAILED"
  | "ORDER_NOT_FOUND"
  | "DISCOVERY_FAILED"
  | "HTTP_ERROR"
  | "UNSUPPORTED_CHAIN"
  | "UNSUPPORTED_ASSET"
  | "VALIDATION_ERROR";

export class CrossChainError extends Error {
  readonly code: ErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    options?: { cause?: Error; context?: Record<string, unknown> },
  ) {
    super(message, { cause: options?.cause });
    this.name = "CrossChainError";
    this.code = code;
    this.context = options?.context;
  }
}

export class QuoteTimeoutError extends CrossChainError {
  constructor(protocol: string, options?: { cause?: Error }) {
    super("QUOTE_TIMEOUT", `Quote timeout for protocol: ${protocol}`, {
      ...options,
      context: { protocol },
    });
    this.name = "QuoteTimeoutError";
  }
}

export class AdapterNotFoundError extends CrossChainError {
  constructor(protocol: string) {
    super("ADAPTER_NOT_FOUND", `No adapter registered for protocol: ${protocol}`, {
      context: { protocol },
    });
    this.name = "AdapterNotFoundError";
  }
}

export class HttpError extends CrossChainError {
  readonly statusCode?: number;

  constructor(message: string, options?: { cause?: Error; statusCode?: number; url?: string }) {
    super("HTTP_ERROR", message, {
      cause: options?.cause,
      context: { statusCode: options?.statusCode, url: options?.url },
    });
    this.name = "HttpError";
    this.statusCode = options?.statusCode;
  }
}

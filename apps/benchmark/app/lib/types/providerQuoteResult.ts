export interface ProviderQuoteResult {
  providerId: string;
  protocolName: string;
  latencyMs?: number;
  eta?: number;
  outputAmount?: string;
  outputAmountUsd?: string;
  outputAssetAddress?: string;
  outputChainId?: number;
  bridgeFeeUsd?: string;
  originGasUsd?: string;
}

export interface ProviderQuoteError {
  providerId?: string;
  errorMessage: string;
  latencyMs?: number;
}

export interface QuoteBenchmarkResponse {
  quotes: ProviderQuoteResult[];
  errors: ProviderQuoteError[];
}

import type { ProviderId, ProviderMeta } from '~/lib/providers';
import type { ProviderQuoteResult } from '~/lib/types';

export type RowStatus = 'idle' | 'querying' | 'settled' | 'errored';

export interface RaceRow {
  provider: ProviderMeta;
  status: RowStatus;
  quote?: ProviderQuoteResult;
  errorMessage?: string;
}

export interface AssetLookup {
  address: string;
  decimals: number;
}

export interface BestProviders {
  winnerProviderId?: ProviderId;
  fastestProviderId?: ProviderId;
}

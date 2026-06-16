import { FetchHttpClient } from '../http';
import type { HttpClient } from '@wonderland/interop-cross-chain';

const DEFILLAMA_BASE_URL = 'https://coins.llama.fi';
const DEFILLAMA_PRICES_PATH = 'prices/current';
const DEFILLAMA_REQUEST_TIMEOUT_MS = 10_000;
// DeFiLlama keys are chain-name prefixed, not chainId. Only the chains the
// benchmark queries are mapped; anything else is skipped (priced as missing).
const LLAMA_CHAIN_BY_ID: Record<number, string> = {
  1: 'ethereum',
  10: 'optimism',
  8453: 'base',
  42161: 'arbitrum',
};
// Keep the comma-joined URL well under fetch/proxy limits. A coin key is
// ~50 chars, so 25 stays under ~1.3KB before the base path.
const MAX_COINS_PER_REQUEST = 25;

export interface PriceCoin {
  chainId: number;
  address: string;
}

export interface PriceInfo {
  priceUsd: number;
  decimals: number;
}

export interface PriceService {
  /**
   * USD price + token decimals keyed by `${chainId}:${address.toLowerCase()}`.
   * Coins on unknown chains, or that the source can't price, are absent.
   */
  getUsdPrices(coins: PriceCoin[]): Promise<Map<string, PriceInfo>>;
}

interface DefiLlamaCoin {
  price?: unknown;
  decimals?: unknown;
}

interface DefiLlamaResponse {
  coins?: Record<string, DefiLlamaCoin>;
}

export function priceKey(chainId: number, address: string): string {
  return `${chainId}:${address.toLowerCase()}`;
}

export class DefiLlamaPriceService implements PriceService {
  constructor(
    private readonly httpClient: HttpClient = new FetchHttpClient({
      baseURL: DEFILLAMA_BASE_URL,
      timeout: DEFILLAMA_REQUEST_TIMEOUT_MS,
    }),
  ) {}

  async getUsdPrices(coins: PriceCoin[]): Promise<Map<string, PriceInfo>> {
    const result = new Map<string, PriceInfo>();
    const requestable = dedupeRequestableCoins(coins);
    if (requestable.length === 0) return result;

    // On any failure (timeout, network, parse) degrade to an empty map so the
    // caller falls back to "—" rather than throwing the whole feed away.
    try {
      const chunks = chunk(requestable, MAX_COINS_PER_REQUEST);
      const responses = await Promise.all(chunks.map((batch) => this.fetchChunk(batch)));
      for (const response of responses) mergeResponse(response, result);
    } catch {
      return new Map();
    }
    return result;
  }

  private async fetchChunk(coins: RequestableCoin[]): Promise<DefiLlamaResponse> {
    const path = `${DEFILLAMA_PRICES_PATH}/${coins.map((coin) => coin.llamaId).join(',')}`;
    const { data } = await this.httpClient.get<DefiLlamaResponse>(path);
    return data ?? {};
  }
}

interface RequestableCoin {
  // `${llamaChain}:${loweraddress}` — both the request token and the response key.
  llamaId: string;
  // `${chainId}:${loweraddress}` — the key the caller looks up.
  key: string;
}

function dedupeRequestableCoins(coins: PriceCoin[]): RequestableCoin[] {
  const seen = new Set<string>();
  const out: RequestableCoin[] = [];
  for (const coin of coins) {
    const llamaChain = LLAMA_CHAIN_BY_ID[coin.chainId];
    if (!llamaChain) continue;
    const address = coin.address.toLowerCase();
    const llamaId = `${llamaChain}:${address}`;
    if (seen.has(llamaId)) continue;
    seen.add(llamaId);
    out.push({ llamaId, key: priceKey(coin.chainId, address) });
  }
  return out;
}

function mergeResponse(response: DefiLlamaResponse, into: Map<string, PriceInfo>): void {
  const coins = response.coins ?? {};
  // Map llamaId back to the caller key via lowercase comparison: the response
  // echoes the requested key, so reuse it directly.
  for (const [llamaId, coin] of Object.entries(coins)) {
    const info = toPriceInfo(coin);
    if (info === null) continue;
    into.set(llamaIdToKey(llamaId), info);
  }
}

function llamaIdToKey(llamaId: string): string {
  const [llamaChain, address] = splitOnce(llamaId, ':');
  const chainId = chainIdForLlama(llamaChain);
  if (chainId === null || !address) return llamaId;
  return priceKey(chainId, address);
}

function splitOnce(value: string, separator: string): [string, string] {
  const index = value.indexOf(separator);
  if (index === -1) return [value, ''];
  return [value.slice(0, index), value.slice(index + 1)];
}

function chainIdForLlama(llamaChain: string): number | null {
  for (const [id, name] of Object.entries(LLAMA_CHAIN_BY_ID)) {
    if (name === llamaChain) return Number(id);
  }
  return null;
}

function toPriceInfo(coin: DefiLlamaCoin): PriceInfo | null {
  const priceUsd = Number(coin.price);
  const decimals = Number(coin.decimals);
  if (!Number.isFinite(priceUsd) || !Number.isInteger(decimals) || decimals < 0) return null;
  return { priceUsd, decimals };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

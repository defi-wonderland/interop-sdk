import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AssetSymbol } from '~/lib/assets';
import { ChainId } from '~/lib/chains';
import { withTimeout } from '~/lib/helpers';
import { checkRateLimit, extractClientIp } from '~/lib/rateLimit';
import { getCachedRaceQuotes } from '~/lib/services/cachedQuoteService';

const ROUTE_TIMEOUT_MS = 30_000;

const CHAIN_IDS = new Set<number>(Object.values(ChainId).filter((value): value is number => typeof value === 'number'));
const ASSET_SYMBOLS = new Set<string>(Object.values(AssetSymbol));

function parseChainId(raw: string | null): ChainId | null {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || !CHAIN_IDS.has(parsed)) return null;
  return parsed as ChainId;
}

function parseAssetSymbol(raw: string | null): AssetSymbol | null {
  if (!raw) return null;
  if (!ASSET_SYMBOLS.has(raw)) return null;
  return raw as AssetSymbol;
}

export async function GET(request: NextRequest) {
  // Only rate-limit when we can identify the caller. If extractClientIp returns
  // null we'd otherwise throttle every anonymous request under one bucket, so
  // letting it through is the safer default for this dev tool.
  const ip = extractClientIp(request.headers);
  if (ip !== null) {
    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', retryAfter: rate.retryAfter },
        { status: 429, headers: rate.retryAfter ? { 'Retry-After': String(rate.retryAfter) } : undefined },
      );
    }
  }

  const { searchParams } = request.nextUrl;
  const fromChainId = parseChainId(searchParams.get('fromChainId'));
  const toChainId = parseChainId(searchParams.get('toChainId'));
  const assetSymbol = parseAssetSymbol(searchParams.get('assetSymbol'));
  const amount = searchParams.get('amount')?.trim() ?? '';

  if (fromChainId === null || toChainId === null || assetSymbol === null || amount === '') {
    return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 });
  }

  if (fromChainId === toChainId) {
    return NextResponse.json({ error: 'SAME_CHAIN' }, { status: 400 });
  }

  const input = { fromChainId, toChainId, assetSymbol, amount };
  const startedAt = Date.now();

  try {
    const result = await withTimeout(getCachedRaceQuotes(input), ROUTE_TIMEOUT_MS, 'ROUTE_TIMEOUT');
    return NextResponse.json({
      quotes: result.quotes,
      errors: result.errors,
      cachedAt: result.cachedAt,
      cacheHit: result.cachedAt < startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'NO_ROUTE';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

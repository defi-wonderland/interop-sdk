/**
 * In-memory token-bucket rate limiter, keyed by IP. 10 requests per 60 seconds,
 * refilling 1 token every 6 seconds. Suitable for a single Next.js node process;
 * not durable across deploys or replicas. Swap for Upstash/KV when we go HA.
 */

const BUCKET_CAPACITY = 10;
const REFILL_INTERVAL_MS = 6_000;
const REFILL_AMOUNT = 1;
const ENTRY_TTL_MS = 5 * 60_000;

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export function checkRateLimit(ip: string, now: number = Date.now()): RateLimitResult {
  cleanupExpired(now);

  const bucket = buckets.get(ip);
  if (!bucket) {
    buckets.set(ip, { tokens: BUCKET_CAPACITY - 1, updatedAt: now });
    return { allowed: true };
  }

  const elapsed = now - bucket.updatedAt;
  const refillTokens = Math.floor(elapsed / REFILL_INTERVAL_MS) * REFILL_AMOUNT;
  if (refillTokens > 0) {
    bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + refillTokens);
    bucket.updatedAt += Math.floor(elapsed / REFILL_INTERVAL_MS) * REFILL_INTERVAL_MS;
  }

  if (bucket.tokens <= 0) {
    const timeToNext = REFILL_INTERVAL_MS - (now - bucket.updatedAt);
    return { allowed: false, retryAfter: Math.max(1, Math.ceil(timeToNext / 1000)) };
  }

  bucket.tokens -= 1;
  return { allowed: true };
}

export function resetRateLimitForTests(): void {
  buckets.clear();
}

function cleanupExpired(now: number): void {
  for (const [ip, bucket] of buckets) {
    if (now - bucket.updatedAt > ENTRY_TTL_MS) {
      buckets.delete(ip);
    }
  }
}

export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

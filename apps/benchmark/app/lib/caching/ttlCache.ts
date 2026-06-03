import type { AsyncCache } from '../interfaces/asyncCache.interface';

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 200;

export interface TtlCacheConfig {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export class TtlCache<V> implements AsyncCache<V> {
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;
  private readonly entries = new Map<string, CacheEntry<V>>();
  private readonly inFlight = new Map<string, Promise<V>>();

  constructor(config: TtlCacheConfig = {}) {
    this.ttlMs = config.ttlMs ?? DEFAULT_TTL_MS;
    this.maxEntries = config.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.now = config.now ?? ((): number => Date.now());
  }

  getOrLoad(key: string, loader: () => Promise<V>): Promise<V> {
    const cached = this.entries.get(key);
    if (cached !== undefined && cached.expiresAt > this.now()) {
      return Promise.resolve(cached.value);
    }

    const pending = this.inFlight.get(key);
    if (pending !== undefined) {
      return pending;
    }

    const promise = Promise.resolve()
      .then(loader)
      .then((value): V => {
        this.store(key, value);
        return value;
      });

    this.inFlight.set(key, promise);
    promise
      .finally((): void => {
        if (this.inFlight.get(key) === promise) {
          this.inFlight.delete(key);
        }
      })
      .catch((): void => {});

    return promise;
  }

  private store(key: string, value: V): void {
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}

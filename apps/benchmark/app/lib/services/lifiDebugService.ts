import { z } from 'zod';
import { FetchHttpClient } from '../http';
import { LifiIntentsOrderMetaSchema } from '../schemas/lifiIntents';
import type { HttpClient } from '@wonderland/interop-cross-chain';

const LIFI_INTENTS_BASE_URL = 'https://order.li.fi';
const LIFI_INTENTS_ORDERS_PATH = 'orders';
const LIFI_INTENTS_PAGE_SIZE = 50;
const LIFI_INTENTS_REQUEST_TIMEOUT_MS = 15_000;
// Mirrors LifiIntentsHistoryService's default limit so the debug view samples
// the same population the leaderboard aggregates.
const ORDERS_PER_ROUTE = 100;

// Superset of the fields the leaderboard pipeline reads: keeps `user` and the
// solver `quote` so failures can be attributed to wallets and to
// quoted-vs-unquoted submissions.
const LifiDebugOrderItemSchema = z
  .object({
    order: z.object({ user: z.string() }).passthrough(),
    quote: z.unknown().nullable().optional(),
    meta: LifiIntentsOrderMetaSchema.extend({
      onChainOrderId: z.string().nullable().optional(),
      orderIdentifier: z.string().nullable().optional(),
    }),
  })
  .passthrough();

const LifiDebugOrdersResponseSchema = z.object({
  data: z.array(LifiDebugOrderItemSchema),
});

export type LifiDebugOrderItem = z.infer<typeof LifiDebugOrderItemSchema>;

export interface LifiDebugRouteOrders {
  originChainId: number;
  destinationChainId: number;
  /** Null when every page request for the route failed. */
  orders: LifiDebugOrderItem[] | null;
}

/**
 * Fetches the raw order pages the leaderboard's LiFi history service consumes,
 * without collapsing them to HistorySamples, so the debug page can inspect the
 * fields (user, solver quote, tx hashes) that aggregation discards.
 */
export class LifiDebugService {
  constructor(
    private readonly httpClient: HttpClient = new FetchHttpClient({
      baseURL: LIFI_INTENTS_BASE_URL,
      timeout: LIFI_INTENTS_REQUEST_TIMEOUT_MS,
    }),
  ) {}

  async getRouteOrders(originChainId: number, destinationChainId: number): Promise<LifiDebugRouteOrders> {
    try {
      const orders: LifiDebugOrderItem[] = [];
      let offset = 0;
      while (orders.length < ORDERS_PER_ROUTE) {
        const page = await this.fetchPage(originChainId, destinationChainId, offset);
        orders.push(...page);
        offset += page.length;
        if (page.length < LIFI_INTENTS_PAGE_SIZE) break;
      }
      return { originChainId, destinationChainId, orders };
    } catch {
      // A dead route should degrade to "no data" in the report, not sink the page.
      return { originChainId, destinationChainId, orders: null };
    }
  }

  private async fetchPage(
    originChainId: number,
    destinationChainId: number,
    offset: number,
  ): Promise<LifiDebugOrderItem[]> {
    const { data } = await this.httpClient.get(LIFI_INTENTS_ORDERS_PATH, {
      params: { originChainId, destinationChainId, limit: LIFI_INTENTS_PAGE_SIZE, offset },
    });
    return LifiDebugOrdersResponseSchema.parse(data).data;
  }
}

import type { LifiDebugOrderItem, LifiDebugRouteOrders } from './services/lifiDebugService';
import type { HistorySampleStatus } from './types/historyMetrics';

/**
 * Mirrors LifiIntentsHistoryService's normalizeStatus so the debug view counts
 * exactly like the leaderboard: Settled/Delivered succeed, Expired/Refunded/
 * Failed fail, anything else (Signed, in-flight states) is pending and excluded
 * from the success-rate denominator.
 */
export function normalizeLifiOrderStatus(status: string): HistorySampleStatus {
  switch (status) {
    case 'Settled':
    case 'Delivered':
      return 'success';
    case 'Expired':
    case 'Refunded':
    case 'Failed':
      return 'failed';
    default:
      return 'pending';
  }
}

export interface StatusTally {
  success: number;
  failed: number;
  pending: number;
  /** success / (success + failed); null when nothing resolved. */
  successRate: number | null;
}

export interface LifiDebugRouteStats extends StatusTally {
  originChainId: number;
  destinationChainId: number;
  /** Days between oldest and newest sampled order; null with <2 orders or a dead route. */
  windowDays: number | null;
  /** True when every page request for the route failed. */
  unavailable: boolean;
}

export interface LifiDebugWalletStats {
  user: string;
  failed: number;
  total: number;
}

export interface LifiDebugFailedOrder {
  originChainId: number;
  destinationChainId: number;
  rawStatus: string;
  submitTimeMs: number;
  user: string;
  hasSolverQuote: boolean;
  initiatedOnChain: boolean;
}

export interface LifiDebugReport {
  totalOrders: number;
  rawStatusCounts: Record<string, number>;
  overall: StatusTally;
  routes: LifiDebugRouteStats[];
  topFailedWallets: LifiDebugWalletStats[];
  /** Overall tally with the single worst-failing wallet's orders removed. */
  excludingTopWallet: StatusTally | null;
  /** Orders where a solver actually quoted before submission. */
  quotedOnly: StatusTally;
  /** Orders submitted without any solver quote attached. */
  unquotedOnly: StatusTally;
  /** Failed orders, newest first. */
  failedOrders: LifiDebugFailedOrder[];
}

const MS_PER_DAY = 86_400_000;
const TOP_WALLET_LIMIT = 8;

function tally(items: readonly LifiDebugOrderItem[]): StatusTally {
  let success = 0;
  let failed = 0;
  let pending = 0;
  for (const item of items) {
    const status = normalizeLifiOrderStatus(item.meta.orderStatus);
    if (status === 'success') success += 1;
    else if (status === 'failed') failed += 1;
    else pending += 1;
  }
  const resolved = success + failed;
  return { success, failed, pending, successRate: resolved === 0 ? null : success / resolved };
}

function dedupeKey(item: LifiDebugOrderItem): string {
  return (
    item.meta.onChainOrderId ??
    item.meta.orderIdentifier ??
    `${item.order.user}-${item.meta.submitTime}-${item.meta.orderStatus}`
  );
}

/**
 * Builds the full debug report from the raw per-route order pages: per-route
 * and overall tallies using the leaderboard's exact status mapping, plus the
 * failure attributions (wallet concentration, quoted-vs-unquoted) that the
 * leaderboard number hides.
 */
export function buildLifiDebugReport(routeOrders: readonly LifiDebugRouteOrders[]): LifiDebugReport {
  const seen = new Set<string>();
  const unique: { route: LifiDebugRouteOrders; item: LifiDebugOrderItem }[] = [];

  const routes: LifiDebugRouteStats[] = routeOrders.map((route) => {
    const orders = route.orders ?? [];
    const fresh: LifiDebugOrderItem[] = [];
    for (const item of orders) {
      const key = dedupeKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      fresh.push(item);
      unique.push({ route, item });
    }
    const timestamps = fresh.map((item) => item.meta.submitTime * 1000).filter((t) => Number.isFinite(t));
    const windowDays = timestamps.length < 2 ? null : (Math.max(...timestamps) - Math.min(...timestamps)) / MS_PER_DAY;
    return {
      originChainId: route.originChainId,
      destinationChainId: route.destinationChainId,
      ...tally(fresh),
      windowDays,
      unavailable: route.orders === null,
    };
  });

  const allItems = unique.map(({ item }) => item);
  const overall = tally(allItems);

  const rawStatusCounts: Record<string, number> = {};
  for (const item of allItems) {
    rawStatusCounts[item.meta.orderStatus] = (rawStatusCounts[item.meta.orderStatus] ?? 0) + 1;
  }

  const byWallet = new Map<string, { failed: number; total: number }>();
  for (const item of allItems) {
    const user = item.order.user.toLowerCase();
    const entry = byWallet.get(user) ?? { failed: 0, total: 0 };
    entry.total += 1;
    if (normalizeLifiOrderStatus(item.meta.orderStatus) === 'failed') entry.failed += 1;
    byWallet.set(user, entry);
  }
  const topFailedWallets = [...byWallet.entries()]
    .map(([user, counts]) => ({ user, ...counts }))
    .filter((wallet) => wallet.failed > 0)
    .sort((a, b) => b.failed - a.failed)
    .slice(0, TOP_WALLET_LIMIT);

  const topWallet = topFailedWallets[0];
  const excludingTopWallet = topWallet
    ? tally(allItems.filter((item) => item.order.user.toLowerCase() !== topWallet.user))
    : null;

  const quoted = allItems.filter((item) => item.quote != null);
  const unquoted = allItems.filter((item) => item.quote == null);

  const failedOrders = unique
    .filter(({ item }) => normalizeLifiOrderStatus(item.meta.orderStatus) === 'failed')
    .map(({ route, item }) => ({
      originChainId: route.originChainId,
      destinationChainId: route.destinationChainId,
      rawStatus: item.meta.orderStatus,
      submitTimeMs: item.meta.submitTime * 1000,
      user: item.order.user.toLowerCase(),
      hasSolverQuote: item.quote != null,
      initiatedOnChain: Boolean(item.meta.orderInitiatedTxHash),
    }))
    .sort((a, b) => b.submitTimeMs - a.submitTimeMs);

  return {
    totalOrders: allItems.length,
    rawStatusCounts,
    overall,
    routes,
    topFailedWallets,
    excludingTopWallet,
    quotedOnly: tally(quoted),
    unquotedOnly: tally(unquoted),
    failedOrders,
  };
}

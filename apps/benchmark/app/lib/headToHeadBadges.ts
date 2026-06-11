import type { ProviderId } from './providers';
import type { ProviderMetrics } from './types/historyMetrics';

export type BestAtBadge = 'FASTEST' | 'CHEAPEST' | 'MOST ACTIVE';

type Selector = (metrics: ProviderMetrics) => number | null;

interface BadgeRule {
  badge: BestAtBadge;
  select: Selector;
  direction: 'min' | 'max';
}

const RULES: readonly BadgeRule[] = [
  { badge: 'FASTEST', select: (m) => m.p50FillSeconds, direction: 'min' },
  { badge: 'CHEAPEST', select: (m) => m.avgFeeUsd, direction: 'min' },
  { badge: 'MOST ACTIVE', select: (m) => m.fillCount, direction: 'max' },
];

/**
 * Per-provider best-at badges for the head-to-head section.
 *
 * A badge is awarded only to the single best provider in that category, and
 * only when there is at least one provider with usable data — categories
 * where every provider returned null or zero fills are skipped entirely.
 */
export function computeBestAtBadges(metrics: readonly ProviderMetrics[]): Map<ProviderId, BestAtBadge[]> {
  const badges = new Map<ProviderId, BestAtBadge[]>();

  for (const rule of RULES) {
    const winner = pickWinner(metrics, rule);
    if (!winner) continue;
    const existing = badges.get(winner.providerId) ?? [];
    existing.push(rule.badge);
    badges.set(winner.providerId, existing);
  }

  return badges;
}

function pickWinner(metrics: readonly ProviderMetrics[], rule: BadgeRule): ProviderMetrics | null {
  const candidates = metrics.filter((m) => {
    const value = rule.select(m);
    // Only providers with positive activity AND a usable, non-negative metric
    // qualify. Negatives are rejected here because the row formatters render
    // them as em-dashes, so awarding a badge on a hidden value would mislead.
    return value !== null && Number.isFinite(value) && value >= 0 && (m.fillCount ?? 0) > 0;
  });
  if (candidates.length === 0) return null;
  return candidates.reduce((best, current) => {
    const a = rule.select(best)!;
    const b = rule.select(current)!;
    if (a === b) {
      // Deterministic tie-break by providerId so the winner doesn't flicker
      // between renders when upstream ordering changes.
      return current.providerId < best.providerId ? current : best;
    }
    return rule.direction === 'min' ? (b < a ? current : best) : b > a ? current : best;
  });
}

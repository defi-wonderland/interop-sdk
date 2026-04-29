/**
 * Source of unix-second timestamps. Injected to keep
 * {@link EtaResolverService} deterministic in tests.
 */
export type Clock = () => number;

const defaultClock: Clock = () => Math.floor(Date.now() / 1000);

/**
 * Resolves the `eta` (estimated seconds until fill) that a Quote should
 * expose, applying a deadline-based fallback when the provider does not
 * return an ETA of its own.
 *
 * Resolution order:
 *   1. `providerEta` if it is a non-negative number.
 *   2. `max(0, deadline - now)` for the first defined deadline candidate.
 *   3. `undefined` when no information is available.
 *
 * Adapters depend on this service so the fallback policy lives in one
 * place and is open for extension (e.g. adding the order's fillDeadline
 * as an extra deadline candidate) without modifying call sites.
 *
 * @example
 * ```ts
 * const eta = etaResolverService.resolve(rawEta, [quoteExpiry]);
 * ```
 */
export class EtaResolverService {
    private readonly clock: Clock;

    constructor(clock: Clock = defaultClock) {
        this.clock = clock;
    }

    /**
     * @param providerEta - ETA reported by the provider (seconds), if any.
     * @param deadlines - Ordered list of unix-second deadline candidates;
     *     the first defined entry is used as fallback.
     * @returns The ETA in seconds, or `undefined` when no candidate applies.
     */
    public resolve(
        providerEta: number | undefined,
        deadlines: ReadonlyArray<number | undefined> = [],
    ): number | undefined {
        if (typeof providerEta === "number" && providerEta >= 0) {
            return providerEta;
        }

        for (const deadline of deadlines) {
            if (typeof deadline === "number") {
                return Math.max(0, deadline - this.clock());
            }
        }

        return undefined;
    }
}

/** Default singleton used by adapters (Spring `@Component` style). */
export const etaResolverService = new EtaResolverService();

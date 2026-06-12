import { CHAIN_IDS, CHAINS, type ChainId } from '../lib/chains';
import { truncateAddress } from '../lib/formatters';
import { buildLifiDebugReport, type StatusTally } from '../lib/lifiDebugAggregation';
import { LifiDebugService } from '../lib/services/lifiDebugService';

// Investigation page: always fetch fresh so the numbers match order.li.fi right now.
export const dynamic = 'force-dynamic';

const lifiDebugService = new LifiDebugService();

const CARD_CLASS = 'border border-border bg-surface-elevated p-4';
const HEADING_CLASS = 'font-mono text-label uppercase text-text-muted';
const TABLE_CLASS = 'w-full font-mono text-sm';
const HEADER_CELL_CLASS = 'px-3 py-2 text-left text-label uppercase text-text-muted';
const CELL_CLASS = 'px-3 py-2 text-text-primary';
const ROW_CLASS = 'border-t border-border';

function formatRate(rate: number | null): string {
  return rate === null ? '—' : `${(rate * 100).toFixed(1)}%`;
}

function formatChain(chainId: number): string {
  return CHAINS[chainId as ChainId]?.displayName ?? `Chain ${chainId}`;
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 16);
}

interface RateBarProps {
  rate: number | null;
}

function RateBar({ rate }: RateBarProps) {
  if (rate === null) return null;
  const pct = Math.round(rate * 100);
  return (
    <div className='h-2 w-32 overflow-hidden rounded-sm bg-border' role='presentation'>
      {/* Width is data-driven; no static utility class can express it. */}
      <div
        className={`h-full ${pct >= 95 ? 'bg-green-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface TallyLineProps {
  label: string;
  tally: StatusTally;
}

function TallyLine({ label, tally }: TallyLineProps) {
  return (
    <div className='flex items-center justify-between gap-4 py-1'>
      <span className='text-text-muted'>{label}</span>
      <span className='font-mono text-text-primary'>
        {tally.success} ok / {tally.failed} failed / {tally.pending} pending → {formatRate(tally.successRate)}
      </span>
    </div>
  );
}

export default async function LifiDebugPage() {
  const routeOrders = await Promise.all(
    CHAIN_IDS.flatMap((originChainId) =>
      CHAIN_IDS.filter((destinationChainId) => destinationChainId !== originChainId).map((destinationChainId) =>
        lifiDebugService.getRouteOrders(originChainId, destinationChainId),
      ),
    ),
  );
  const report = buildLifiDebugReport(routeOrders);

  return (
    <main className='min-h-screen bg-background px-6 py-10'>
      <div className='mx-auto flex max-w-5xl flex-col gap-6'>
        <header>
          <h1 className='text-xl font-semibold text-text-primary'>LiFi success-rate investigation</h1>
          <p className='mt-1 text-sm text-text-muted'>
            Raw orders from order.li.fi for the 12 leaderboard routes, counted with the exact status mapping the
            leaderboard uses (Settled/Delivered = success, Expired/Refunded/Failed = failure, rest excluded).
          </p>
        </header>

        <section className={CARD_CLASS} aria-label='overall tallies'>
          <h2 className={HEADING_CLASS}>Overall</h2>
          <div className='mt-2 text-sm'>
            <TallyLine label={`All ${report.totalOrders} sampled orders (leaderboard number)`} tally={report.overall} />
            <TallyLine label='Only orders with a solver quote' tally={report.quotedOnly} />
            <TallyLine label='Orders submitted without a solver quote' tally={report.unquotedOnly} />
            {report.excludingTopWallet && report.topFailedWallets[0] && (
              <TallyLine
                label={`Excluding top failing wallet ${truncateAddress(report.topFailedWallets[0].user)}`}
                tally={report.excludingTopWallet}
              />
            )}
          </div>
          <p className='mt-3 text-sm text-text-muted'>
            Raw statuses:{' '}
            {Object.entries(report.rawStatusCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => `${status} ${count}`)
              .join(' · ')}
          </p>
        </section>

        <section className={CARD_CLASS} aria-label='per-route success rates'>
          <h2 className={HEADING_CLASS}>Per route</h2>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={HEADER_CELL_CLASS}>Route</th>
                <th className={HEADER_CELL_CLASS}>OK</th>
                <th className={HEADER_CELL_CLASS}>Failed</th>
                <th className={HEADER_CELL_CLASS}>Pending</th>
                <th className={HEADER_CELL_CLASS}>Window</th>
                <th className={HEADER_CELL_CLASS}>Success</th>
                <th className={HEADER_CELL_CLASS}></th>
              </tr>
            </thead>
            <tbody>
              {report.routes.map((route) => (
                <tr key={`${route.originChainId}-${route.destinationChainId}`} className={ROW_CLASS}>
                  <td className={CELL_CLASS}>
                    {formatChain(route.originChainId)} → {formatChain(route.destinationChainId)}
                    {route.unavailable && <span className='ml-2 text-text-muted'>(fetch failed)</span>}
                  </td>
                  <td className={CELL_CLASS}>{route.success}</td>
                  <td className={CELL_CLASS}>{route.failed}</td>
                  <td className={CELL_CLASS}>{route.pending}</td>
                  <td className={CELL_CLASS}>{route.windowDays === null ? '—' : `${route.windowDays.toFixed(1)}d`}</td>
                  <td className={CELL_CLASS}>{formatRate(route.successRate)}</td>
                  <td className={CELL_CLASS}>
                    <RateBar rate={route.successRate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className='mt-2 text-sm text-text-muted'>
            Window = age span of the ≤100 most-recent orders the API returns per route. A short window means the sample
            is dominated by a recent burst of activity.
          </p>
        </section>

        <section className={CARD_CLASS} aria-label='failures by wallet'>
          <h2 className={HEADING_CLASS}>Failures by wallet</h2>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={HEADER_CELL_CLASS}>Wallet</th>
                <th className={HEADER_CELL_CLASS}>Failed</th>
                <th className={HEADER_CELL_CLASS}>Total orders</th>
                <th className={HEADER_CELL_CLASS}>Share of all failures</th>
              </tr>
            </thead>
            <tbody>
              {report.topFailedWallets.map((wallet) => (
                <tr key={wallet.user} className={ROW_CLASS}>
                  <td className={CELL_CLASS}>{wallet.user}</td>
                  <td className={CELL_CLASS}>{wallet.failed}</td>
                  <td className={CELL_CLASS}>{wallet.total}</td>
                  <td className={CELL_CLASS}>
                    {report.overall.failed === 0
                      ? '—'
                      : `${((wallet.failed / report.overall.failed) * 100).toFixed(0)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={CARD_CLASS} aria-label='failed orders'>
          <h2 className={HEADING_CLASS}>Failed orders (newest first)</h2>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={HEADER_CELL_CLASS}>Submitted (UTC)</th>
                <th className={HEADER_CELL_CLASS}>Route</th>
                <th className={HEADER_CELL_CLASS}>Status</th>
                <th className={HEADER_CELL_CLASS}>Wallet</th>
                <th className={HEADER_CELL_CLASS}>Solver quote</th>
                <th className={HEADER_CELL_CLASS}>On-chain</th>
              </tr>
            </thead>
            <tbody>
              {report.failedOrders.map((order) => (
                <tr key={`${order.user}-${order.submitTimeMs}`} className={ROW_CLASS}>
                  <td className={CELL_CLASS}>{formatDate(order.submitTimeMs)}</td>
                  <td className={CELL_CLASS}>
                    {formatChain(order.originChainId)} → {formatChain(order.destinationChainId)}
                  </td>
                  <td className={CELL_CLASS}>{order.rawStatus}</td>
                  <td className={CELL_CLASS}>{truncateAddress(order.user)}</td>
                  <td className={CELL_CLASS}>{order.hasSolverQuote ? 'yes' : 'no'}</td>
                  <td className={CELL_CLASS}>{order.initiatedOnChain ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

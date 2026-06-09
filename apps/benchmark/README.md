# benchmark

Next.js app that benchmarks cross-chain quote performance across providers via
[`@wonderland/interop-cross-chain`](../../packages/cross-chain).

## Development

```bash
pnpm install
pnpm --filter benchmark dev
```

Open http://localhost:3000.

## Caching

The whole page is server-rendered with hourly ISR (`revalidate=3600`), so each section's first paint can be up to an hour old. The quote race (section 01) then re-runs client-side on demand and fetches fresh quotes; the leaderboard (section 02) is not refetched after load.

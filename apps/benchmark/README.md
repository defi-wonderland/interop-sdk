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

Live quotes (section 01) are never cached, every run hits the providers fresh. The historical sections are cached: the leaderboard and the head-to-head's first paint come from the page render (revalidated hourly), while changing the head-to-head route refetches through a 60s-cached API route. So the canonical route can show slightly different freshness on first paint versus after re-selecting it.

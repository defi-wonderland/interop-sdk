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

Live quotes (section 01) are never cached, every run hits the providers fresh. The leaderboard (section 02) is cached via the page render (revalidated hourly).

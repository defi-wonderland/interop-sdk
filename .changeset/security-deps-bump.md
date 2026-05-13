---
"@wonderland/interop-addresses": minor
"@wonderland/interop-cross-chain": minor
"@wonderland/interop": minor
---

Update direct dependencies to remove security vulnerabilities and migrate to the latest stable releases.

-   `uuid` 13.0.0 → 14.0.0 in `@wonderland/interop-cross-chain` (patches the buffer-bounds advisory; only `v4` is used).
-   `zod` 3.24.3 → 4.4.3. The public API surface keeps the same shape; internal schema sites were migrated to the v4 form: `z.string().url(...)` → `z.url(...)`, `z.record(value)` → `z.record(z.string(), value)`, and `.refine(check, dataFn)` → `.refine(check, { error: (issue) => ... })` for dynamic messages.
-   `viem` (devDep) and `typescript` (devDep) bumped to 2.48.8 and 5.9.3. `peerDependencies.viem` moves to `^2.35.0`: `getEnsAddress.coinType` became `bigint` in 2.35, so the old `^2.28.0` range would have produced a type error for consumers on 2.28.x–2.34.x.
-   `ts-to-zod` (cross-chain devDep) bumped to 5.1.0 to align with zod 4.

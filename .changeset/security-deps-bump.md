---
"@wonderland/interop-addresses": minor
"@wonderland/interop-cross-chain": minor
---

Update direct dependencies to remove security vulnerabilities and migrate to the latest stable releases.

-   `axios` 1.13.2 → 1.16.0 (patches a high-severity DoS via `__proto__`, plus two moderate CVEs around `NO_PROXY` SSRF and header-injection cloud metadata exfiltration).
-   `uuid` 13.0.0 → 14.0.0 in `@wonderland/interop-cross-chain` (patches the buffer-bounds advisory; only `v4` is used).
-   `zod` 3.24.3 → 4.4.3. The public API surface keeps the same shape; internal schema sites were migrated to the v4 form: `z.string().url(...)` → `z.url(...)`, `z.record(value)` → `z.record(z.string(), value)`, and `.refine(check, dataFn)` → `.refine(check, { error: (issue) => ... })` for dynamic messages.
-   `viem` (devDep) and `typescript` (devDep) bumped to 2.48.8 and 5.9.3 respectively. The `peerDependencies.viem` range stays at `^2.28.0` so consumers are not forced to upgrade.
-   `ts-to-zod` (cross-chain devDep) bumped to 5.1.0 to align with zod 4.

`viem` 2.48 changed `getEnsAddress.coinType` from `number` to `bigint`; the internal ENS resolver was updated accordingly.

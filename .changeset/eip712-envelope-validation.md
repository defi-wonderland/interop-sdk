---
"@wonderland/interop-cross-chain": minor
---

Add reusable EIP-712 envelope validation utilities under `src/core`: `validatePrimaryType` and `validateEnvelopeDomain` for envelope-level checks, `validatePermit2Message` for Permit2 single and batch payloads, and `validateEip3009Message` for transfer/receive-with-authorization payloads. Mismatches throw a typed `Eip712EnvelopeMismatch`.

Hardening applied as part of this PR:

-   `chainId` parser delegates hex decoding to viem's `isHex` + `hexToBigInt` and matches decimals against `/^\d+$/`, so `' 1 '`, `'0X1'`, `'0b1'`, `'0o7'` and `'0x'` no longer coerce to mainnet.
-   `toNonNegativeBigInt` and `toUnixSeconds` apply the same strict-grammar approach to amount and timestamp wire fields.
-   `validatePermit2Message` calls `assertNotNativeAsset` on every permitted token and refuses `maxAmount` without `inputToken` (heterogeneous-token sums are unsafe).
-   `validateEip3009Message` rejects post-dated `validAfter` timestamps. The contract allow-list (including rejecting native-asset placeholders) is left to the caller via `validateEnvelopeDomain`.
-   `validateEnvelopeDomain` also forbids `domain.salt` for Permit2 envelopes (same rationale as `domain.version`).
-   `readPermittedEntries` threads the caller's `provider` through every nested mismatch, so logs attribute correctly.
-   Batch entries that are `null` or non-objects now surface as typed `Eip712EnvelopeMismatch` instead of a raw `TypeError`.
-   viem's `getAddress` errors propagate via `cause` on the typed mismatch.

These utilities are not wired into any protocol yet — Bungee, Relay, and OIF integration will follow in separate changes.

---
"@wonderland/interop-cross-chain": minor
---

Add reusable EIP-712 envelope validation utilities under `src/core`: `validatePrimaryType` and `validateEnvelopeDomain` for envelope-level checks, `validatePermit2Message` for Permit2 single and batch payloads, and `validateEip3009Message` for transfer/receive-with-authorization payloads. Mismatches throw a typed `Eip712EnvelopeMismatch`.

The validators focus on the checks that actually carry security weight — `chainId` equality, `verifyingContract` allow-list, address equality for `from`/`to`/`spender`, amount caps via `toNonNegativeBigInt` (with a non-negative guard so a tampered envelope can't smuggle a negative entry under the cap), and deadline / `validAfter` freshness. Wire-format hardening for whitespace, alternative number bases, missing `domain.version`, native-asset placeholders, and similar shape errors is left to the caller's schema layer (Zod) and the on-chain signature check.

These utilities are not wired into any protocol yet — Bungee, Relay, and OIF integration will follow in separate changes.

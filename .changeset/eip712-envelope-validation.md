---
"@wonderland/interop-cross-chain": minor
---

Add reusable EIP-712 envelope validation utilities under `src/core`: `validatePrimaryType` and `validateEnvelopeDomain` for envelope-level checks, `validatePermit2Message` for Permit2 single and batch payloads, and `validateEip3009Message` for transfer/receive-with-authorization payloads. Mismatches throw a typed `Eip712EnvelopeMismatch`. EIP-3009 `message.value` is decoded strictly (only `bigint`, numeric strings, and safe-integer numbers).

These utilities are not wired into any protocol yet — Bungee, Relay, and OIF integration will follow in separate changes.

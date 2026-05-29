---
"@wonderland/interop-cross-chain": minor
---

Add an opt-in consumer-provided spender validation.

The `Aggregator` takes an optional `spenderValidator: SpenderValidator` (same injection style as `approvalService`). When set, `getQuotes` drops quotes whose counterparty is not trusted and surfaces them as `UntrustedSpender` entries in the `errors` array; `buildQuote` throws `UntrustedSpender`. Without a validator, behavior is unchanged.

Counterparties are derived from the payload rather than provider-supplied hints: the decoded ERC-20 `approve` spender (falling back to the transaction `to` when the calldata is not an `approve`), the Permit2 `spender` and EIP-3009 `to` carried in signature steps, and any `checks.allowances[].spender`. Signature steps whose counterparty cannot be determined are rejected (fail-closed).

`createSpenderValidator({ trustedSpenders })` builds the default `AllowlistSpenderValidator` from a per-chain allowlist (`SpenderAllowlist`, validated by `SpenderAllowlistSchema`). Addresses are normalized before comparison and the check is fail-closed on chains absent from the list. The SDK ships no curated registry; the consumer maintains the list, or implements `SpenderValidator` to validate against their own contract registry.

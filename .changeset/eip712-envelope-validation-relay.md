---
"@wonderland/interop-cross-chain": patch
---

Wire the EIP-712 envelope validators into the Relay signature flow. The Relay quote adapter now runs `validateRelaySignatureEnvelope` before surfacing any EIP-712 signature step, so tampered envelopes are rejected with a typed `Eip712EnvelopeMismatch` before the wallet is prompted.

The validator dispatches by `primaryType` to the Permit2 or EIP-3009 path, enforces Relay-specific invariants (no native input asset, Permit2 domain without `version`, EIP-3009 domain with a non-empty `version`), and reads the recipient field from the envelope (`spender` for Permit2, `to` for EIP-3009) to assert it is a well-formed address and is not the user.

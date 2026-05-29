---
"@wonderland/interop-cross-chain": minor
---

Wire EIP-712 envelope validation into the Bungee signature flow so tampered envelopes are rejected with `Eip712EnvelopeMismatch` before the wallet is prompted to sign.

---
"@wonderland/interop-cross-chain": patch
---

Address release review findings across cross-chain providers. OIF escrow validation now rejects malformed witness outputs with `Eip712EnvelopeMismatch` instead of a raw `TypeError`. `createCrossChainProvider` no longer resolves prototype-chain keys like `toString`. Relay exact-input quotes keep the user's signed input amount as the envelope max-spend cap instead of using solver quote data. Bungee manual-route allowances now target the built transaction's chain instead of the quote origin chain.

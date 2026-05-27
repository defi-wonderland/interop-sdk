---
"@wonderland/interop-cross-chain": minor
---

Wire the EIP-712 envelope validators into the OIF signature flow. The OIF order adapter now runs `validateOifEscrowSignatureEnvelope` or `validateOif3009SignatureEnvelope` before surfacing any EIP-712 signature step, so tampered envelopes are rejected with a typed `Eip712EnvelopeMismatch` before the wallet is prompted.

The escrow path validates against the canonical Permit2 singleton and the batched `PermitBatchWitnessTransferFrom` primary type; the EIP-3009 path validates against the token contract declared in the order metadata and the `ReceiveWithAuthorization` family. Both paths cross-check the message against the original `QuoteRequest` (chain id, token, recipient, amount) when it is available.

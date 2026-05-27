---
"@wonderland/interop-cross-chain": minor
---

Wire the EIP-712 envelope validators into the OIF signature flow. The OIF order adapter now runs `validateOifEscrowSignatureEnvelope` or `validateOif3009SignatureEnvelope` before surfacing any EIP-712 signature step, so tampered envelopes are rejected with a typed `Eip712EnvelopeMismatch` before the wallet is prompted.

The escrow path validates against the canonical Permit2 singleton, the batched `PermitBatchWitnessTransferFrom` primary type, and cross-checks the `witness.user` and the single `witness.outputs[0]` entry (`chainId`, `token`, `recipient`, `amount`) against the user's quote request — a malicious solver can no longer keep the permit fields intact while redirecting the destination output. The EIP-3009 path validates the typed-data domain (which is the token contract itself by definition) against the user's input asset and cross-checks `from`, `to`, and `value`.

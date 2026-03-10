---
"@wonderland/interop-addresses": minor
---

Add bip122 (Bitcoin) address support. Handles base58check (P2PKH/P2SH), SegWit v0 (bech32), and Taproot v1 (bech32m) addresses. `addressToText` now takes an optional `chainReference` parameter needed for bech32 HRP derivation.

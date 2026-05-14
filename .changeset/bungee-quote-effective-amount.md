---
"@wonderland/interop-cross-chain": minor
---

Surface post-fee expected output and slippage floor on `Quote.preview.outputs` across providers.

`QuotePreviewEntry` gains an optional `minAmount` field — the slippage floor guaranteed to the user after the provider's slippage tolerance is applied.

Per-provider behavior:

-   **Bungee** previously mapped `amount` (pre-fee optimistic) as the headline output. Wallets quoted that number and users saw less than promised once fees were deducted on fill. The adapter now uses `effectiveAmount ?? amount` for the headline (post-fee expected) with matching `effectiveValueInUsd ?? valueInUsd` for the USD value, and exposes `minAmountOut` as `minAmount`. Verified against a live Bungee quote (10 USDC Arbitrum → Base): pre-fee `amount` was 9.988676, `effectiveAmount` was 9.955638, `minAmountOut` was 9.954642. The headline now matches what the user actually receives.
-   **Across** already mapped `expectedOutputAmount` (post-fee) for the headline. It now also exposes `minOutputAmount` as `minAmount`.
-   **Relay** already mapped `currencyOut.amount` for the headline. It now also exposes `currencyOut.minimumAmount` as `minAmount`.

Atomic intent providers (LiFi Intents, OIF) leave `minAmount` undefined and continue to set `amount` to the exact filled amount — there is no slippage in an atomic intent.

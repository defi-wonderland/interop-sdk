---
"@wonderland/interop-cross-chain": minor
---

Expose USD values on quote preview inputs and outputs

-   `QuotePreviewEntrySchema` now includes an optional `amountUsd` decimal-string field, mirroring the convention of `QuoteFeeEntrySchema.amountUsd`.
-   Relay adapter populates `amountUsd` from `details.currencyIn.amountUsd` and `details.currencyOut.amountUsd`.
-   Bungee adapter populates `amountUsd` from `result.input.valueInUsd` and `autoRoute.output.valueInUsd`.

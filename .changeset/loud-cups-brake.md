---
"@wonderland/interop-cross-chain": patch
---

feat: implement OIF payload validation for all order types

Add validators for OIF order types to prevent malicious solver responses:

-   `oif-escrow-v0` (Permit2): validates token, amount, deadline
-   `oif-resource-lock-v0` (BatchCompact): validates token, amount, sponsor, expiration
-   `oif-3009-v0` (TransferWithAuthorization): validates from, value, tokenAddress
-   `oif-user-open-v0`: validates allowances match user intent

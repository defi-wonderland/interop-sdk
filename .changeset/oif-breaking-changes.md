---
"@wonderland/interop-cross-chain": minor
---

Align `oif-escrow-v0` with the new OIF deployment.

-   `PERMIT2_TYPES.Permit2Witness` now starts with `user` (address). Canonical type: `Permit2Witness(address user,uint32 expires,address inputOracle,MandateOutput[] outputs)`. `oifEscrowValidator` rejects quotes whose `payload.message.witness.user` is missing or does not match the requested user.
-   `OIF_INPUT_SETTLER_ESCROW_BY_CHAIN` → `0x1CC9260E285C2C8AC8D2E7102F3978056Ec1d0a8` (Arbitrum, Base, Optimism).
-   `OIF_OUTPUT_SETTLER_BY_CHAIN` → `0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10` (Arbitrum, Base, Optimism).

Breaking: consumers caching the previous settler addresses or signing the 3-field witness must update — the new contracts reject the old digest.

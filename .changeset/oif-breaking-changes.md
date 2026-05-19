---
"@wonderland/interop-cross-chain": patch
---

Align `oif-escrow-v0` orders with the new OIF deployment

OIF redeployed both settlers and changed the Permit2 witness shape. The SDK now signs and references the updated contracts.

-   `PERMIT2_TYPES.Permit2Witness` lists `user` (address) as the first field. The canonical type is `Permit2Witness(address user,uint32 expires,address inputOracle,MandateOutput[] outputs)`. The solver populates `payload.message.witness.user`, so no extra message-level rewrite is needed in the SDK.
-   `OIF_INPUT_SETTLER_ESCROW_BY_CHAIN` now points to `0x1CC9260E285C2C8AC8D2E7102F3978056Ec1d0a8` on Arbitrum, Base and Optimism.
-   `OIF_OUTPUT_SETTLER_BY_CHAIN` now points to `0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10` on Arbitrum, Base and Optimism.

Anything that cached the previous settler addresses or signed the 3-field witness must be updated — the new contracts reject the old digest.

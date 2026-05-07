---
"@wonderland/interop-cross-chain": patch
---

Add `user` to the Permit2 witness for `oif-escrow-v0` orders

The OIF protocol now requires `address user` as the first field of `Permit2Witness`. Without this field in the canonical EIP-712 types, the SDK signs a digest the contract no longer recognizes and the on-chain `open()` call is rejected.

-   `PERMIT2_TYPES.Permit2Witness` in `protocols/oif/constants.ts` now lists `user` (address) as the first field, matching `Permit2Witness(address user,uint32 expires,address inputOracle,MandateOutput[] outputs)`.
-   The solver populates `payload.message.witness.user`, so no message-level rewrite is needed in the SDK.

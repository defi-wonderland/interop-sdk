---
"@wonderland/interop-cross-chain": minor
---

Validate Superbridge gasless signatures against the quote request

Gasless Superbridge routes now cross-check the EIP-712 envelope the user is asked to sign against their quote request — chain, verifying contract, token, amount cap, spender/recipient and deadline — the same way Bungee, Relay and OIF already do. An envelope that doesn't line up, or one whose type we don't recognise, is rejected instead of handed to the wallet. User-transaction routes keep relying on the aggregator's spender allowlist, so no canonical-address registry lives in the SDK.

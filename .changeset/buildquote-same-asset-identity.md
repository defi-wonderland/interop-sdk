---
"@wonderland/interop-cross-chain": patch
---

Strengthen the buildQuote same-asset check

buildQuote now confirms that the input and output of a same-asset transfer agree on symbol and decimals and are listed by a common provider, instead of matching on the token symbol alone. Cross-token swaps continue to go through getQuotes(), and allowDangerousParameters still bypasses the check.

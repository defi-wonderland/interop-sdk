---
"@wonderland/interop-addresses": minor
---

feat: add experimental onchain chain registry support via cid.eth

Add `useExperimentalChainRegistry` option to `parseName()` for resolving chain labels using ENS-based onchain registries:

-   Query chain labels (e.g., "optimism", "arbitrum") via the ChainResolver contract
-   Falls back to offchain chainid.network if onchain resolution fails
-   Export new `resolveChainFromRegistry()` function for direct registry queries

```typescript
const result = await parseName("0x...@optimism", {
    useExperimentalChainRegistry: "cid.eth",
});
```

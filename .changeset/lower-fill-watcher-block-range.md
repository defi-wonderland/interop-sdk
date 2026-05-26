---
"@wonderland/interop-cross-chain": patch
---

Lower `EventBasedFillWatcher` block range from 40,000 to 9,000.

`arbitrum-one-rpc.publicnode.com` caps `eth_getLogs` at 10,000 blocks and rejected every poll with `exceed maximum block range`. The error was swallowed as "not filled yet", so on-chain tracking for orders destined to Arbitrum (e.g. OIF buildQuote) never detected the `OutputFilled` event and timed out as `Awaiting solver` even when the fill had already happened on-chain. 9,000 sits under every public RPC limit we use (publicnode-arbitrum: 10k, publicnode-base/optimism: 50k) and still gives ~37 min of detection window on Arbitrum, which is plenty for fresh fills.

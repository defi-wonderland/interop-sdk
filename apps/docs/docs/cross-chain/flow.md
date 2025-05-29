---
title: Flow
---

This document provides an overview of the cross-chain transaction flow using the Interop SDK. It illustrates how a developer can interact with different cross-chain protocols, specifically Across and OIF 1.0, to obtain quotes, simulate transactions, and execute them on-chain. The flow diagram below details the sequence of interactions between the developer, the SDK, the protocol services, and the blockchain RPC endpoint.

```mermaid
sequenceDiagram
  Actor dev as Dev
  participant sdk as Interop SDK
  participant across as Across
  participant oif as OIF 1.0
  participant rpc as RPC

  alt Use Across
    dev ->>+ sdk: Get Quote: Input, Across
    sdk ->>+ across: Get Quote: Input
    across ->>- sdk: Quote
    sdk ->>- dev: Quote

    dev ->>+ sdk: Simulate Open: Quote, Across
    sdk ->>+ across: Simulate Open: Quote
    across ->>- sdk: Tx to Execute
    sdk ->>- dev: Tx to Execute

    dev ->>+ rpc: Open: Tx to Execute
    rpc ->>- dev: Result

  else Use OIF 1.0
    dev ->>+ sdk: Get Quote: Input, OIF1.0
    sdk ->>+ oif: Get Quote: Input
    oif ->>- sdk: Quote
    sdk ->>- dev: Quote

    dev ->>+ sdk: Simulate Open: Quote, OIF1.0
    sdk ->>+ oif: Simulate Open: Quote
    oif ->>- sdk: Tx to Execute
    sdk ->>- dev: Tx to Execute

    dev ->>+ rpc: Open: Tx to Execute
    rpc ->>- dev: Result

end
```

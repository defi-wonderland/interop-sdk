# @wonderland/interop-cross-chain-next

Modular, plugin-based SDK for cross-chain swaps.

## Usage

```typescript
import { SwapAggregator } from "@wonderland/interop-cross-chain-next";

// 1. Create
const aggregator = SwapAggregator.create({
  oif: {
    solvers: [
      { url: "https://solver-alpha.com", variants: ["escrow"] },
      { url: "https://solver-beta.com", variants: ["escrow", "user-open"] },
    ],
  },
});

// 2. Quote — each quote comes with approvals + preparedOrder
const quotes = await aggregator.getQuotes({
  sender: "0xUser...",
  input: { chainId: 1, token: "0xUSDC...", amount: 1_000_000n },
  output: { chainId: 10, token: "0xUSDC..." },
});

// 3. Pick a quote
const quote = quotes[0];

// 4. Handle approvals (if any)
//    - Permit2/EIP-3009 (escrow): usually none — the signature IS the authorization.
//      May include a one-time Permit2 contract approval for new tokens.
//    - User-open: includes the ERC20 approve to the settlement contract.
for (const approval of quote.approvals) {
  await wallet.sendTransaction(approval);
}

// 5. Handle the main action
const result = quote.preparedOrder.type === "signature"
  ? await wallet.signTypedData(quote.preparedOrder.signPayload)  // escrow: just sign, no tx
  : await wallet.sendTransaction(quote.preparedOrder.transaction); // user-open: send tx

// 6. Submit — hand back the signature or txHash
const ref = await aggregator.submit(quote, result);

// 7. Track
for await (const update of aggregator.trackOrder(ref)) {
  console.log(update.status); // "pending" → "filling" → "filled"
}
```

## Architecture

```
src/
  core/
    types.ts          Shared domain interfaces (SwapAdapter, SwapQuote, Asset, …)
    errors.ts         Error hierarchy (CrossChainError → QuoteTimeoutError, …)
    http.ts           HttpClient interface — abstracts axios/fetch
  aggregator/
    SwapAggregator.ts Orchestrator: factory wiring + request routing
  protocols/
    oif/
      Client.ts       Typed HTTP wrapper for the OIF Solver API
      types.ts        Internal OIF types (OIFOrderType, EIP712TypeDefinition)
      constants.ts    Order types, signature prefixes, defaults
      schemas.ts      Zod validation for API responses
      mappers.ts      OIF API → SDK type normalization (status, quotes, assets, typed data)
      adapters/
        EscrowAdapter.ts    SwapAdapter — escrow / resource-lock / 3009 strategies
        UserOpenAdapter.ts  SwapAdapter — user-open strategy
```

## Adding a new protocol

1. Create `src/protocols/<name>/Client.ts` — receives an `HttpClient`, exposes typed API calls.
2. Add `types.ts`, `constants.ts`, `schemas.ts`, `mappers.ts` for protocol internals.
3. Create one or more `SwapAdapter` implementations under `adapters/`.
4. Register in `SwapAggregator.create()` config shape & wiring block.
